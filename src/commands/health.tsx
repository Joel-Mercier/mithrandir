import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { DataTable } from "@/components/DataTable.js";
import { loadEnvConfig, getBackupConfig } from "@/lib/config.js";
import {
  APP_REGISTRY,
  getContainerName,
  getComposePath,
} from "@/lib/apps.js";
import { isDockerInstalled } from "@/lib/docker.js";
import { isRcloneInstalled, isRcloneRemoteConfigured, isRemoteReachable } from "@/lib/rclone.js";
import { shell } from "@/lib/shell.js";
import { Header } from "@/components/Header.js";
import { isBackupArchive, ENCRYPTED_EXT, ARCHIVE_EXT } from "@/lib/backup-utils.js";
import type { EnvConfig } from "@/types.js";
import { existsSync } from "fs";

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckStatus = "pass" | "warn" | "fail";

interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
}

// ─── Health checks ───────────────────────────────────────────────────────────

async function checkDocker(): Promise<CheckResult> {
  const installed = await isDockerInstalled();
  if (!installed) {
    return { name: "Docker", status: "fail", message: "Not installed" };
  }
  const result = await shell("docker", ["info"], {
    sudo: true,
    ignoreError: true,
  });
  if (result.exitCode !== 0) {
    return { name: "Docker", status: "fail", message: "Daemon not running" };
  }
  return { name: "Docker", status: "pass", message: "Daemon running" };
}

async function checkDiskSpace(
  label: string,
  path: string,
): Promise<CheckResult> {
  const name = `Disk (${label})`;
  if (!existsSync(path)) {
    return { name, status: "warn", message: `${path} — not found` };
  }
  const result = await shell(
    "df",
    ["--output=pcent", path],
    { ignoreError: true },
  );
  if (result.exitCode !== 0) {
    return { name, status: "warn", message: `${path} — could not check` };
  }
  const lines = result.stdout.trim().split("\n");
  const pctLine = lines[lines.length - 1].trim();
  const pct = parseInt(pctLine.replace("%", ""), 10);
  if (isNaN(pct)) {
    return { name, status: "warn", message: `${path} — could not parse usage` };
  }
  if (pct >= 95) {
    return { name, status: "fail", message: `${path} — ${pct}% used` };
  }
  if (pct >= 80) {
    return { name, status: "warn", message: `${path} — ${pct}% used` };
  }
  return { name, status: "pass", message: `${path} — ${pct}% used` };
}

async function checkBackupAge(backupDir: string): Promise<CheckResult> {
  const archiveDir = `${backupDir}/archive`;
  if (!existsSync(archiveDir)) {
    return { name: "Backup Age", status: "warn", message: "No backups found" };
  }
  const result = await shell("ls", ["-1", archiveDir], { ignoreError: true });
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return { name: "Backup Age", status: "warn", message: "No backups found" };
  }
  const dates = result.stdout
    .trim()
    .split("\n")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  if (dates.length === 0) {
    return { name: "Backup Age", status: "warn", message: "No backups found" };
  }

  const latest = dates[0];
  const latestDate = new Date(latest + "T00:00:00");
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays > 7) {
    return {
      name: "Backup Age",
      status: "fail",
      message: `Latest: ${latest} (${diffDays} days ago)`,
    };
  }
  if (diffDays > 2) {
    return {
      name: "Backup Age",
      status: "warn",
      message: `Latest: ${latest} (${diffDays} days ago)`,
    };
  }
  const dayLabel = diffDays === 0 ? "today" : diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  return {
    name: "Backup Age",
    status: "pass",
    message: `Latest: ${latest} (${dayLabel})`,
  };
}

async function checkContainerRestarts(
  baseDir: string,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const installedApps = APP_REGISTRY.filter((app) =>
    existsSync(getComposePath(app, baseDir)),
  );

  if (installedApps.length === 0) {
    return [
      {
        name: "Containers",
        status: "pass",
        message: "No apps installed",
      },
    ];
  }

  const problems: string[] = [];
  for (const app of installedApps) {
    const containerName = getContainerName(app);
    const result = await shell(
      "docker",
      [
        "inspect",
        "--format",
        "{{.RestartCount}} {{.State.Status}}",
        containerName,
      ],
      { sudo: true, ignoreError: true },
    );
    if (result.exitCode !== 0) continue;

    const output = result.stdout.trim();
    const match = output.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;

    const restartCount = parseInt(match[1], 10);
    const status = match[2];

    if (status === "restarting" || restartCount > 5) {
      problems.push(
        `${app.name} ${status} (${restartCount} restarts)`,
      );
    }
  }

  if (problems.length > 0) {
    return problems.map((msg) => ({
      name: "Containers",
      status: "fail" as CheckStatus,
      message: msg,
    }));
  }

  return [
    {
      name: "Containers",
      status: "pass",
      message: `${installedApps.length} container${installedApps.length !== 1 ? "s" : ""} healthy`,
    },
  ];
}

async function checkBackupEncryption(
  backupDir: string,
  password?: string,
): Promise<CheckResult | null> {
  // Find the latest backup dir
  const archiveDir = `${backupDir}/archive`;
  if (!existsSync(archiveDir)) return null;

  const result = await shell("ls", ["-1", archiveDir], { ignoreError: true });
  if (result.exitCode !== 0 || !result.stdout.trim()) return null;

  const dates = result.stdout
    .trim()
    .split("\n")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  if (dates.length === 0) return null;

  // Check files in the latest backup
  const latestDir = `${archiveDir}/${dates[0]}`;
  const lsResult = await shell("ls", ["-1", latestDir], { ignoreError: true });
  if (lsResult.exitCode !== 0 || !lsResult.stdout.trim()) return null;

  const files = lsResult.stdout.trim().split("\n").filter(isBackupArchive);
  if (files.length === 0) return null;

  const encCount = files.filter((f) => f.endsWith(ENCRYPTED_EXT)).length;
  const plainCount = files.filter((f) => f.endsWith(ARCHIVE_EXT)).length;

  if (encCount > 0 && plainCount === 0) {
    return {
      name: "Encryption",
      status: "pass",
      message: "Backups encrypted",
    };
  }
  if (plainCount > 0 && encCount === 0 && !password) {
    return {
      name: "Encryption",
      status: "warn",
      message: "Encryption not configured — backups stored in plaintext",
    };
  }
  if (plainCount > 0 && encCount === 0 && password) {
    return {
      name: "Encryption",
      status: "warn",
      message: "Password set but existing backups are unencrypted (next backup will encrypt)",
    };
  }
  if (encCount > 0 && plainCount > 0) {
    return {
      name: "Encryption",
      status: "warn",
      message: "Mixed encrypted/unencrypted backups found",
    };
  }
  return null;
}

async function checkRemoteBackup(
  rcloneRemotes: string[],
  env?: EnvConfig,
): Promise<CheckResult[]> {
  const installed = await isRcloneInstalled();
  if (!installed) {
    return [{
      name: "Remote Backup",
      status: "warn",
      message: "rclone not installed",
    }];
  }

  const results: CheckResult[] = [];
  for (const remote of rcloneRemotes) {
    const configured = await isRcloneRemoteConfigured(remote, env);
    if (!configured.configured) {
      results.push({
        name: `Remote (${remote})`,
        status: "warn",
        message: "not configured",
      });
      continue;
    }

    const reachable = await isRemoteReachable(remote);
    if (!reachable) {
      results.push({
        name: `Remote (${remote})`,
        status: "fail",
        message: "unreachable",
      });
    } else {
      results.push({
        name: `Remote (${remote})`,
        status: "pass",
        message: "reachable",
      });
    }
  }

  return results;
}

/** Run all health checks and return results */
async function runChecks(): Promise<CheckResult[]> {
  const envConfig = await loadEnvConfig();
  const backupConfig = getBackupConfig(envConfig);
  const baseDir = envConfig.BASE_DIR;
  const backupDir = backupConfig.BACKUP_DIR;

  const [docker, diskApps, diskBackups, backupAge, containers, remoteResults, encryption] =
    await Promise.all([
      checkDocker(),
      checkDiskSpace("apps", baseDir),
      checkDiskSpace("backups", backupDir),
      checkBackupAge(backupDir),
      checkContainerRestarts(baseDir),
      checkRemoteBackup(backupConfig.RCLONE_REMOTES, envConfig),
      checkBackupEncryption(backupDir, backupConfig.BACKUP_PASSWORD),
    ]);

  const results = [docker, diskApps, diskBackups, backupAge, ...containers, ...remoteResults];
  if (encryption) results.push(encryption);
  return results;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

function statusIcon(status: CheckStatus): { char: string; color: string } {
  switch (status) {
    case "pass":
      return { char: "✓", color: "green" };
    case "warn":
      return { char: "⚠", color: "yellow" };
    case "fail":
      return { char: "✗", color: "red" };
  }
}

// ─── Interactive (TTY) component ─────────────────────────────────────────────

function HealthCommand() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runChecks()
      .then((checks) => {
        setResults(checks);
        setPhase("done");
        const hasFail = checks.some((c) => c.status === "fail");
        const t1 = setTimeout(() => {
          if (hasFail) process.exitCode = 1;
          exit();
        }, 100);
        t1.unref();
      })
      .catch((err) => {
        setError(err.message);
        setPhase("error");
        const t2 = setTimeout(() => {
          process.exitCode = 1;
          exit();
        }, 100);
        t2.unref();
      });
  }, []);

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <Header title="Health Check" />
        <StatusMessage variant="error">Failed: {error}</StatusMessage>
      </Box>
    );
  }

  if (phase === "loading") {
    return (
      <Box flexDirection="column">
        <Header title="Health Check" />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Running health checks...
        </Text>
      </Box>
    );
  }

  const hasFail = results.some((r) => r.status === "fail");
  const hasWarn = results.some((r) => r.status === "warn");

  const tableData = results.map((r) => {
    const icon = statusIcon(r.status);
    return {
      Check: r.name,
      Status: `${icon.char} ${r.status.toUpperCase()}`,
      Details: r.message,
    };
  });

  return (
    <Box flexDirection="column">
      <Header title="Health Check" />
      <DataTable data={tableData} />
      <Box marginTop={1}>
        <Text dimColor>
          {"  "}
          {hasFail
            ? "One or more checks failed."
            : hasWarn
              ? "All checks passed with warnings."
              : "All checks passed."}
        </Text>
      </Box>
    </Box>
  );
}

function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

// ─── Headless (non-TTY) ──────────────────────────────────────────────────────

async function runHeadlessHealth(): Promise<void> {
  const results = await runChecks();

  console.log("=== Health Check ===");
  console.log("");

  const nameWidth = Math.max(...results.map((r) => r.name.length));

  for (const r of results) {
    const prefix =
      r.status === "pass"
        ? "[PASS]"
        : r.status === "warn"
          ? "[WARN]"
          : "[FAIL]";
    console.log(`${prefix} ${pad(r.name, nameWidth)}  ${r.message}`);
  }

  console.log("");

  const hasFail = results.some((r) => r.status === "fail");
  const hasWarn = results.some((r) => r.status === "warn");

  if (hasFail) {
    console.log("One or more checks failed.");
    process.exitCode = 1;
  } else if (hasWarn) {
    console.log("All checks passed with warnings.");
  } else {
    console.log("All checks passed.");
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runHealth(): Promise<void> {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(<HealthCommand />);
    await waitUntilExit();
  } else {
    await runHeadlessHealth();
  }
}
