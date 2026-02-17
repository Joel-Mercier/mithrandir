import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { DataTable } from "../components/DataTable.js";
import Link from "ink-link";
import { Divider } from "../components/Divider.js";
import { loadEnvConfig, loadBackupConfig } from "../lib/config.js";
import {
  APP_REGISTRY,
  getContainerName,
  getComposePath,
  getAppDir,
} from "../lib/apps.js";
import { isDockerInstalled } from "../lib/docker.js";
import { shell } from "../lib/shell.js";
import { isTimerActive, hasSystemd } from "../lib/systemd.js";
import { getLocalIp } from "../lib/distro.js";
import { Header } from "../components/Header.js";
import type { AppDefinition } from "../types.js";
import { existsSync } from "fs";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppInfo {
  app: AppDefinition;
  containerStatus: string;
  url: string | null;
  lastBackup: string | null;
  diskUsage: string;
}

interface SystemInfo {
  dockerRunning: boolean;
  timerActive: boolean | null; // null = no systemd
  timerNext: string | null;
  apps: AppInfo[];
}

// ─── Data gathering ──────────────────────────────────────────────────────────

/** Find installed apps by checking for docker-compose.yml */
function detectInstalledApps(baseDir: string): AppDefinition[] {
  const installed: AppDefinition[] = [];
  for (const app of APP_REGISTRY) {
    const composePath = getComposePath(app, baseDir);
    if (existsSync(composePath)) {
      installed.push(app);
    }
  }
  return installed;
}

/** Get container status via docker inspect */
async function getContainerStatus(app: AppDefinition): Promise<string> {
  const containerName = getContainerName(app);
  const result = await shell(
    "docker",
    ["inspect", "--format", "{{.State.Status}}", containerName],
    { sudo: true, ignoreError: true },
  );
  if (result.exitCode !== 0) return "not found";
  return result.stdout.trim() || "not found";
}

/** Get most recent backup date for an app */
async function getLastBackupDate(
  app: AppDefinition,
  backupDir: string,
): Promise<string | null> {
  // Check archive/ for date directories containing this app's backup
  const result = await shell("ls", ["-1", `${backupDir}/archive`], {
    ignoreError: true,
  });
  if (result.exitCode !== 0 || !result.stdout.trim()) return null;

  const dates = result.stdout
    .trim()
    .split("\n")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  for (const date of dates) {
    const tarPath = `${backupDir}/archive/${date}/${app.name}.tar.zst`;
    if (existsSync(tarPath)) return date;
  }
  return null;
}

/** Get disk usage for an app directory */
async function getDiskUsage(app: AppDefinition, baseDir: string): Promise<string> {
  const appDir = getAppDir(app, baseDir);
  if (!existsSync(appDir)) return "—";
  const result = await shell("du", ["-sh", appDir], {
    sudo: true,
    ignoreError: true,
  });
  if (result.exitCode !== 0 || !result.stdout.trim()) return "—";
  return result.stdout.trim().split(/\s+/)[0] || "—";
}

/** Get next timer run time */
async function getTimerNextRun(): Promise<string | null> {
  const result = await shell(
    "systemctl",
    ["show", "homelab-backup.timer", "--property=NextElapseUSecRealtime"],
    { sudo: true, ignoreError: true },
  );
  if (result.exitCode !== 0 || !result.stdout.trim()) return null;
  const value = result.stdout.trim().replace("NextElapseUSecRealtime=", "");
  if (!value || value === "n/a") return null;
  // Format: "Day YYYY-MM-DD HH:MM:SS TZ" — extract just the date+time
  const match = value.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
  return match ? match[1] : value;
}

/** Gather all system info */
async function gatherSystemInfo(): Promise<SystemInfo> {
  const envConfig = await loadEnvConfig();
  const backupConfig = await loadBackupConfig();
  const baseDir = envConfig.BASE_DIR;
  const backupDir = backupConfig.BACKUP_DIR;

  // Check Docker
  const dockerInstalled = await isDockerInstalled();
  let dockerRunning = false;
  if (dockerInstalled) {
    const result = await shell("docker", ["info"], {
      sudo: true,
      ignoreError: true,
    });
    dockerRunning = result.exitCode === 0;
  }

  // Check systemd timer
  const systemdAvailable = await hasSystemd();
  let timerActive: boolean | null = null;
  let timerNext: string | null = null;
  if (systemdAvailable) {
    timerActive = await isTimerActive();
    if (timerActive) {
      timerNext = await getTimerNextRun();
    }
  }

  // Find installed apps
  const installedApps = detectInstalledApps(baseDir);

  // Get local IP for URLs
  const localIp = await getLocalIp();

  // Gather per-app info in parallel
  const apps = await Promise.all(
    installedApps.map(async (app): Promise<AppInfo> => {
      const [containerStatus, lastBackup, diskUsage] = await Promise.all([
        dockerRunning ? getContainerStatus(app) : Promise.resolve("unknown"),
        getLastBackupDate(app, backupDir),
        getDiskUsage(app, baseDir),
      ]);

      const url = app.port ? `http://${localIp}:${app.port}` : null;

      return { app, containerStatus, url, lastBackup, diskUsage };
    }),
  );

  return { dockerRunning, timerActive, timerNext, apps };
}

// ─── Table helpers ───────────────────────────────────────────────────────────

function statusDotChar(status: string): string {
  const dot =
    status === "running"
      ? "● "
      : status === "restarting"
        ? "● "
        : status === "not found" || status === "unknown"
          ? "● "
          : "● ";
  return dot + status;
}

function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

// ─── Interactive (TTY) component ─────────────────────────────────────────────

function StatusCommand() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gatherSystemInfo()
      .then((result) => {
        setInfo(result);
        setPhase("done");
        setTimeout(() => exit(), 100);
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
        <Header title="System Status" />
        <StatusMessage variant="error">Failed: {error}</StatusMessage>
      </Box>
    );
  }

  if (phase === "loading" || !info) {
    return (
      <Box flexDirection="column">
        <Header title="System Status" />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Gathering system information...
        </Text>
      </Box>
    );
  }

  const runningCount = info.apps.filter((a) => a.containerStatus === "running").length;
  const stoppedCount = info.apps.length - runningCount;

  const tableData = info.apps.map((a) => ({
    App: a.app.displayName,
    Status: statusDotChar(a.containerStatus),
    Backup: a.lastBackup ?? "none",
    Disk: a.diskUsage,
  }));

  return (
    <Box flexDirection="column">
      <Header title="System Status" />

      {/* System services */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          {"  Docker          "}
          {info.dockerRunning ? (
            <Text color="green">● Running</Text>
          ) : (
            <Text color="red">● Not running</Text>
          )}
        </Text>
        {info.timerActive !== null && (
          <Text>
            {"  Backup Timer    "}
            {info.timerActive ? (
              <>
                <Text color="green">● Active</Text>
                {info.timerNext && <Text dimColor> — Next: {info.timerNext}</Text>}
              </>
            ) : (
              <Text color="red">● Inactive</Text>
            )}
          </Text>
        )}
      </Box>

      <Divider title="Services" titleColor="yellow" dividerColor="gray" />

      {info.apps.length === 0 ? (
        <Text dimColor>  No apps installed.</Text>
      ) : (
        <Box flexDirection="column">
          <DataTable data={tableData} />

          {/* Clickable URLs */}
          <Box flexDirection="column" marginTop={1}>
            <Text bold>  Quick Links:</Text>
            {info.apps
              .filter((a) => a.url)
              .map((a) => (
                <Text key={a.app.name}>
                  {"    "}{a.app.displayName.padEnd(18)}
                  <Link url={a.url!}>
                    <Text color="cyan">{a.url}</Text>
                  </Link>
                </Text>
              ))}
          </Box>
        </Box>
      )}

      {/* Summary */}
      {info.apps.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {"  "}
            {info.apps.length} app{info.apps.length !== 1 ? "s" : ""} installed
            {" — "}
            {runningCount} running
            {stoppedCount > 0 && `, ${stoppedCount} stopped`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Headless (non-TTY) ──────────────────────────────────────────────────────

async function runHeadlessStatus(): Promise<void> {
  const info = await gatherSystemInfo();

  console.log("=== System Status ===");
  console.log(
    `Docker: ${info.dockerRunning ? "Running" : "Not running"}`,
  );
  if (info.timerActive !== null) {
    const timerStr = info.timerActive
      ? `Active${info.timerNext ? ` — Next: ${info.timerNext}` : ""}`
      : "Inactive";
    console.log(`Backup Timer: ${timerStr}`);
  }
  console.log("");

  if (info.apps.length === 0) {
    console.log("No apps installed.");
    return;
  }

  // Print plaintext table
  const nameW = Math.max(4, ...info.apps.map((a) => a.app.displayName.length));
  const statusW = Math.max(6, ...info.apps.map((a) => a.containerStatus.length));
  const urlW = Math.max(3, ...info.apps.map((a) => (a.url ?? "—").length));
  const backupW = 10;
  const diskW = Math.max(4, ...info.apps.map((a) => a.diskUsage.length));

  const header = `${pad("App", nameW)}  ${pad("Status", statusW)}  ${pad("URL", urlW)}  ${pad("Backup", backupW)}  ${pad("Disk", diskW)}`;
  console.log(header);
  console.log("-".repeat(header.length));

  for (const a of info.apps) {
    console.log(
      `${pad(a.app.displayName, nameW)}  ${pad(a.containerStatus, statusW)}  ${pad(a.url ?? "—", urlW)}  ${pad(a.lastBackup ?? "none", backupW)}  ${pad(a.diskUsage, diskW)}`,
    );
  }

  const runningCount = info.apps.filter((a) => a.containerStatus === "running").length;
  const stoppedCount = info.apps.length - runningCount;
  console.log("");
  console.log(
    `${info.apps.length} app${info.apps.length !== 1 ? "s" : ""} installed — ${runningCount} running${stoppedCount > 0 ? `, ${stoppedCount} stopped` : ""}`,
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runStatus(): Promise<void> {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(<StatusCommand />);
    await waitUntilExit();
  } else {
    await runHeadlessStatus();
  }
}
