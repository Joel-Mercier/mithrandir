import { loadEnvConfig, getBackupConfig } from "@/lib/config.js";
import {
  APP_REGISTRY,
  getContainerName,
  getComposePath,
  getAppDir,
} from "@/lib/apps.js";
import { isDockerInstalled, isContainerRunning } from "@/lib/docker.js";
import { shell } from "@/lib/shell.js";
import { isTimerActive, hasSystemd } from "@/lib/systemd.js";
import { getLocalIp } from "@/lib/distro.js";
import { getDuckDnsDomain } from "@/lib/caddy.js";
import { findArchiveFile } from "@/lib/backup-utils.js";
import type { AppDefinition } from "@/types.js";
import { existsSync } from "fs";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppInfo {
  app: AppDefinition;
  containerStatus: string;
  url: string | null;
  lastBackup: string | null;
  diskUsage: string;
}

export interface SystemInfo {
  dockerRunning: boolean;
  timerActive: boolean | null; // null = no systemd
  timerNext: string | null;
  docsRunning: boolean;
  docsUrl: string | null;
  uiRunning: boolean;
  uiUrl: string | null;
  apps: AppInfo[];
}

// ─── Data gathering ──────────────────────────────────────────────────────────

/** Find installed apps by checking for docker-compose.yml */
export function detectInstalledApps(baseDir: string): AppDefinition[] {
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
export async function getContainerStatus(app: AppDefinition): Promise<string> {
  const containerName = getContainerName(app);
  const result = await shell(
    "docker",
    ["inspect", "--format", "{{.State.Status}}", containerName],
    { sudo: true, ignoreError: true, timeout: 10000 },
  );
  if (result.exitCode !== 0) return "not found";
  return result.stdout.trim() || "not found";
}

/** Get most recent backup date for an app */
export async function getLastBackupDate(
  app: AppDefinition,
  backupDir: string,
): Promise<string | null> {
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
    if (findArchiveFile(`${backupDir}/archive/${date}`, app.name)) return date;
  }
  return null;
}

/** Get disk usage for an app directory */
export async function getDiskUsage(app: AppDefinition, baseDir: string): Promise<string> {
  const appDir = getAppDir(app, baseDir);
  if (!existsSync(appDir)) return "—";
  const result = await shell("du", ["-sh", appDir], {
    sudo: true,
    ignoreError: true,
    timeout: 10000,
  });
  if (result.exitCode !== 0 || !result.stdout.trim()) return "—";
  return result.stdout.trim().split(/\s+/)[0] || "—";
}

/** Get next timer run time */
export async function getTimerNextRun(): Promise<string | null> {
  const result = await shell(
    "systemctl",
    ["show", "homelab-backup.timer", "--property=NextElapseUSecRealtime"],
    { sudo: true, ignoreError: true },
  );
  if (result.exitCode !== 0 || !result.stdout.trim()) return null;
  const value = result.stdout.trim().replace("NextElapseUSecRealtime=", "");
  if (!value || value === "n/a") return null;
  const match = value.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
  return match ? match[1] : value;
}

/** Gather all system info */
export async function gatherSystemInfo(projectRoot?: string): Promise<SystemInfo> {
  const envConfig = await loadEnvConfig(projectRoot);
  const backupConfig = getBackupConfig(envConfig);
  const baseDir = envConfig.BASE_DIR;
  const backupDir = backupConfig.BACKUP_DIR;

  // Check Docker
  const dockerInstalled = await isDockerInstalled();
  let dockerRunning = false;
  if (dockerInstalled) {
    const result = await shell("docker", ["info"], {
      sudo: true,
      ignoreError: true,
      timeout: 10000,
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

  // HTTPS config
  const httpsEnabled = envConfig.ENABLE_HTTPS === "true";
  const primaryDomain = httpsEnabled ? getDuckDnsDomain(envConfig) : null;

  // Check docs container
  const docsRunning = dockerRunning ? await isContainerRunning("mithrandir-docs") : false;
  let docsUrl: string | null = null;
  if (docsRunning) {
    docsUrl = httpsEnabled && primaryDomain
      ? `https://mithrandir-docs.${primaryDomain}`
      : `http://${localIp}:4173`;
  }

  // Check UI container
  const uiRunning = dockerRunning ? await isContainerRunning("mithrandir-ui") : false;
  let uiUrl: string | null = null;
  if (uiRunning) {
    uiUrl = httpsEnabled && primaryDomain
      ? `https://mithrandir.${primaryDomain}`
      : `http://${localIp}:4180`;
  }

  // Gather per-app info in parallel
  const apps = await Promise.all(
    installedApps.map(async (app): Promise<AppInfo> => {
      const [containerStatus, lastBackup, diskUsage] = await Promise.all([
        dockerRunning ? getContainerStatus(app) : Promise.resolve("unknown"),
        getLastBackupDate(app, backupDir),
        getDiskUsage(app, baseDir),
      ]);

      let url: string | null = null;
      if (app.port) {
        url = httpsEnabled && primaryDomain
          ? `https://${app.name}.${primaryDomain}`
          : `http://${localIp}:${app.port}`;
      }

      return { app, containerStatus, url, lastBackup, diskUsage };
    }),
  );

  return { dockerRunning, timerActive, timerNext, docsRunning, docsUrl, uiRunning, uiUrl, apps };
}
