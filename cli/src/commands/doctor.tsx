import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { Header } from "@/components/Header.js";
import { loadEnvConfig, getBackupConfig, getProjectRoot } from "@/lib/config.js";
import {
  APP_REGISTRY,
  getContainerName,
  getComposePath,
  getConfigPaths,
} from "@/lib/apps.js";
import { isDockerInstalled } from "@/lib/docker.js";
import { isRcloneInstalled, isRcloneRemoteConfigured } from "@/lib/rclone.js";
import { isTimerActive } from "@/lib/systemd.js";
import { shell } from "@/lib/shell.js";
import { existsSync } from "fs";
import type { EnvConfig } from "@/types.js";

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckStatus = "pass" | "warn" | "fail";

interface CheckResult {
  category: string;
  name: string;
  status: CheckStatus;
  message: string;
  hint?: string;
}

// ─── Checks ──────────────────────────────────────────────────────────────────

function checkEnvFile(): CheckResult {
  const root = getProjectRoot();
  const envPath = `${root}/.env`;
  if (existsSync(envPath)) {
    return { category: "System", name: ".env file", status: "pass", message: "Found" };
  }
  return {
    category: "System",
    name: ".env file",
    status: "fail",
    message: "Missing",
    hint: "Run `mithrandir setup` to create it",
  };
}

async function checkDocker(): Promise<CheckResult[]> {
  const installed = await isDockerInstalled();
  if (!installed) {
    return [{
      category: "System",
      name: "Docker",
      status: "fail",
      message: "Not installed",
      hint: "Run `mithrandir install docker` to install it",
    }];
  }
  const result = await shell("docker", ["info"], { sudo: true, ignoreError: true });
  if (result.exitCode !== 0) {
    return [{
      category: "System",
      name: "Docker",
      status: "fail",
      message: "Installed but daemon not running",
      hint: "Run `sudo systemctl start docker`",
    }];
  }
  return [{
    category: "System",
    name: "Docker",
    status: "pass",
    message: "Installed and running",
  }];
}

async function checkStoppedContainers(baseDir: string): Promise<CheckResult> {
  const installedApps = APP_REGISTRY.filter((app) =>
    existsSync(getComposePath(app, baseDir)),
  );

  if (installedApps.length === 0) {
    return { category: "Apps", name: "Stopped containers", status: "pass", message: "No apps installed" };
  }

  const stopped: string[] = [];
  for (const app of installedApps) {
    const containerName = getContainerName(app);
    const result = await shell(
      "docker",
      ["inspect", "--format", "{{.State.Status}}", containerName],
      { sudo: true, ignoreError: true },
    );
    if (result.exitCode !== 0) {
      stopped.push(app.name);
      continue;
    }
    const status = result.stdout.trim();
    if (status !== "running") {
      stopped.push(app.name);
    }
  }

  if (stopped.length > 0) {
    return {
      category: "Apps",
      name: "Stopped containers",
      status: "warn",
      message: stopped.join(", "),
      hint: "Run `mithrandir start <app>` to start them",
    };
  }
  return { category: "Apps", name: "Stopped containers", status: "pass", message: "All running" };
}

function checkConfigDirs(baseDir: string): CheckResult {
  const installedApps = APP_REGISTRY.filter((app) =>
    existsSync(getComposePath(app, baseDir)),
  );

  if (installedApps.length === 0) {
    return { category: "Apps", name: "Config directories", status: "pass", message: "No apps installed" };
  }

  const missing: string[] = [];
  for (const app of installedApps) {
    const paths = getConfigPaths(app, baseDir);
    for (const p of paths) {
      if (!existsSync(p)) {
        missing.push(`${app.name}: ${p}`);
      }
    }
  }

  if (missing.length > 0) {
    return {
      category: "Apps",
      name: "Config directories",
      status: "warn",
      message: missing.join(", "),
      hint: "Run `mithrandir reinstall <app>` to recreate missing directories",
    };
  }
  return { category: "Apps", name: "Config directories", status: "pass", message: "All present" };
}

function checkSecrets(envConfig: EnvConfig, baseDir: string): CheckResult[] {
  const installedApps = APP_REGISTRY.filter((app) =>
    existsSync(getComposePath(app, baseDir)),
  );

  const results: CheckResult[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  for (const app of installedApps) {
    if (!app.secrets) continue;
    for (const secret of app.secrets) {
      const value = envConfig[secret.envVar];
      if (!value || value.trim() === "") {
        if (secret.required) {
          missingRequired.push(`${secret.envVar} (${app.name})`);
        } else {
          missingOptional.push(`${secret.envVar} (${app.name})`);
        }
      }
    }
  }

  if (missingRequired.length > 0) {
    results.push({
      category: "Apps",
      name: "Required secrets",
      status: "fail",
      message: missingRequired.join(", "),
      hint: "Run `mithrandir setup` to configure secrets",
    });
  } else {
    results.push({
      category: "Apps",
      name: "Required secrets",
      status: "pass",
      message: "All set",
    });
  }

  if (missingOptional.length > 0) {
    results.push({
      category: "Apps",
      name: "Optional secrets",
      status: "warn",
      message: missingOptional.join(", "),
      hint: "Run `mithrandir setup` to configure secrets",
    });
  } else {
    results.push({
      category: "Apps",
      name: "Optional secrets",
      status: "pass",
      message: "All set",
    });
  }

  return results;
}

function checkBackupDir(backupDir: string): CheckResult {
  if (existsSync(backupDir)) {
    return {
      category: "Backup",
      name: "Backup directory",
      status: "pass",
      message: `${backupDir} exists`,
    };
  }
  return {
    category: "Backup",
    name: "Backup directory",
    status: "fail",
    message: `${backupDir} missing`,
    hint: "Run `mithrandir install backup` to set up backups",
  };
}

function checkSystemdService(): CheckResult {
  const servicePath = "/etc/systemd/system/homelab-backup.service";
  if (existsSync(servicePath)) {
    return { category: "Backup", name: "Systemd service", status: "pass", message: "Installed" };
  }
  return {
    category: "Backup",
    name: "Systemd service",
    status: "fail",
    message: "Missing",
    hint: "Run `mithrandir install backup` to set up the backup service",
  };
}

async function checkSystemdTimer(): Promise<CheckResult> {
  const active = await isTimerActive();
  if (active) {
    return { category: "Backup", name: "Backup timer", status: "pass", message: "Active" };
  }
  return {
    category: "Backup",
    name: "Backup timer",
    status: "fail",
    message: "Not active",
    hint: "Run `mithrandir install backup` to set up the backup timer",
  };
}

async function checkRclone(rcloneRemote: string): Promise<CheckResult[]> {
  const installed = await isRcloneInstalled();
  if (!installed) {
    return [{
      category: "Backup",
      name: "rclone",
      status: "fail",
      message: "Not installed",
      hint: "Run `mithrandir install backup` to install rclone",
    }];
  }

  const configured = await isRcloneRemoteConfigured(rcloneRemote);
  if (!configured.configured) {
    return [{
      category: "Backup",
      name: "rclone",
      status: "fail",
      message: `Installed, but remote "${rcloneRemote}" not configured`,
      hint: "Run `rclone config` to set up the remote",
    }];
  }

  return [{
    category: "Backup",
    name: "rclone",
    status: "pass",
    message: `Installed, remote "${rcloneRemote}" configured`,
  }];
}

// ─── Run all checks ─────────────────────────────────────────────────────────

async function runChecks(): Promise<CheckResult[]> {
  const envConfig = await loadEnvConfig();
  const backupConfig = getBackupConfig(envConfig);
  const baseDir = envConfig.BASE_DIR;

  const hasInstalledApps = APP_REGISTRY.some((app) =>
    existsSync(getComposePath(app, baseDir)),
  );

  // System checks
  const envCheck = checkEnvFile();
  const dockerChecks = await checkDocker();

  const results: CheckResult[] = [envCheck, ...dockerChecks];

  // App checks
  const stoppedCheck = await checkStoppedContainers(baseDir);
  const configDirCheck = checkConfigDirs(baseDir);
  const secretChecks = checkSecrets(envConfig, baseDir);
  results.push(stoppedCheck, configDirCheck, ...secretChecks);

  // Backup checks (skip if no apps installed)
  if (hasInstalledApps) {
    const backupDirCheck = checkBackupDir(backupConfig.BACKUP_DIR);
    const serviceCheck = checkSystemdService();
    const [timerCheck, rcloneChecks] = await Promise.all([
      checkSystemdTimer(),
      checkRclone(backupConfig.RCLONE_REMOTE),
    ]);
    results.push(backupDirCheck, serviceCheck, timerCheck, ...rcloneChecks);
  }

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

function statusLabel(status: CheckStatus): string {
  return status.toUpperCase();
}

// ─── Interactive (TTY) component ─────────────────────────────────────────────

function DoctorCommand() {
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
        setTimeout(() => {
          if (hasFail) process.exitCode = 1;
          exit();
        }, 100);
      })
      .catch((err) => {
        setError(err.message);
        setPhase("error");
        setTimeout(() => {
          process.exitCode = 1;
          exit();
        }, 100);
      });
  }, []);

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <Header title="Doctor" />
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (phase === "loading") {
    return (
      <Box flexDirection="column">
        <Header title="Doctor" />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Running diagnostics...
        </Text>
      </Box>
    );
  }

  // Group by category
  const categories = [...new Set(results.map((r) => r.category))];
  const issueCount = results.filter((r) => r.status === "fail" || r.status === "warn").length;

  return (
    <Box flexDirection="column">
      <Header title="Doctor" />
      {categories.map((cat) => (
        <Box key={cat} flexDirection="column" marginBottom={1}>
          <Text bold>  {cat}</Text>
          {results
            .filter((r) => r.category === cat)
            .map((r) => {
              const icon = statusIcon(r.status);
              return (
                <Box key={r.name} flexDirection="column">
                  <Text>
                    {"  "}
                    <Text color={icon.color}>{icon.char} {statusLabel(r.status)}</Text>
                    {"  "}
                    <Text dimColor>{r.name}</Text>
                    {"  "}
                    {r.message}
                  </Text>
                  {r.hint && (
                    <Text dimColor>{"        "}{r.hint}</Text>
                  )}
                </Box>
              );
            })}
        </Box>
      ))}
      <Box>
        <Text dimColor>
          {"  "}
          {issueCount === 0
            ? "No issues found."
            : `${issueCount} issue${issueCount !== 1 ? "s" : ""} found. Run the suggested commands to fix them.`}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Headless (non-TTY) ──────────────────────────────────────────────────────

function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

async function runHeadlessDoctor(): Promise<void> {
  const results = await runChecks();

  console.log("=== Doctor ===");
  console.log("");

  const categories = [...new Set(results.map((r) => r.category))];
  const nameWidth = Math.max(...results.map((r) => r.name.length));

  for (const cat of categories) {
    console.log(`${cat}:`);
    for (const r of results.filter((r) => r.category === cat)) {
      const prefix =
        r.status === "pass"
          ? "[PASS]"
          : r.status === "warn"
            ? "[WARN]"
            : "[FAIL]";
      console.log(`  ${prefix} ${pad(r.name, nameWidth)}  ${r.message}`);
      if (r.hint) {
        console.log(`         ${" ".repeat(nameWidth)}  ${r.hint}`);
      }
    }
    console.log("");
  }

  const issueCount = results.filter((r) => r.status === "fail" || r.status === "warn").length;
  const hasFail = results.some((r) => r.status === "fail");

  if (issueCount === 0) {
    console.log("No issues found.");
  } else {
    console.log(`${issueCount} issue${issueCount !== 1 ? "s" : ""} found. Run the suggested commands to fix them.`);
  }

  if (hasFail) {
    process.exitCode = 1;
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runDoctor(): Promise<void> {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(<DoctorCommand />);
    await waitUntilExit();
  } else {
    await runHeadlessDoctor();
  }
}
