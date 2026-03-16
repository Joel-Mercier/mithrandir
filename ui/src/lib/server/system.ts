import { createServerFn } from "@tanstack/react-start";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ensureSession } from "#/lib/auth";
import { getProjectRoot } from "./utils";
import { loadEnvConfig, getBackupConfig, saveEnvConfig } from "@mithrandir/cli/lib/config";
import { gatherSystemInfo } from "@mithrandir/cli/lib/status";
import { runHealthChecks } from "@mithrandir/cli/lib/health";
import { shell } from "@mithrandir/cli/lib/shell";
import { getDuckDnsDomain } from "@mithrandir/cli/lib/caddy";
import type {
  HealthStatus,
  SystemConfig,
  SystemResources,
  VersionInfo,
} from "#/lib/types";

export const fetchSystemStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<HealthStatus> => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const info = await gatherSystemInfo(projectRoot);

    const running = info.apps.filter((a) => a.containerStatus === "running").length;
    const stopped = info.apps.length - running;

    return {
      performanceVerdict: "Comfortable",
      storageVerdict: "Healthy",
      dockerRunning: info.dockerRunning,
      appsRunning: running,
      appsStopped: stopped,
      appsTotal: info.apps.length,
    };
  },
);

export const fetchHealthChecks = createServerFn({ method: "GET" }).handler(
  async () => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    return await runHealthChecks(projectRoot);
  },
);

export const fetchConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<SystemConfig> => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);
    const backupConfig = getBackupConfig(envConfig);
    const domain = getDuckDnsDomain(envConfig);

    return {
      baseDir: envConfig.BASE_DIR,
      timezone: envConfig.TZ ?? "Etc/UTC",
      httpsEnabled: envConfig.ENABLE_HTTPS === "true",
      firewallEnabled: envConfig.ENABLE_FIREWALL === "true",
      acmeEmail: envConfig.ACME_EMAIL ?? "",
      duckdnsDomain: domain ?? "",
      backupDir: backupConfig.BACKUP_DIR,
      backupHour: backupConfig.BACKUP_HOUR,
      backupPassword: !!backupConfig.BACKUP_PASSWORD,
      localRetention: backupConfig.LOCAL_RETENTION,
      remoteRetention: backupConfig.REMOTE_RETENTION,
      remotes: backupConfig.RCLONE_REMOTES,
      puid: parseInt(envConfig.PUID ?? "1000", 10),
      pgid: parseInt(envConfig.PGID ?? "1000", 10),
    };
  },
);

export const fetchResources = createServerFn({ method: "GET" }).handler(
  async (): Promise<SystemResources> => {
    await ensureSession();

    // Get CPU info
    let cpuModel = "Unknown";
    let cores = 1;
    const cpuResult = await shell("nproc", [], { ignoreError: true, timeout: 5000 });
    if (cpuResult.exitCode === 0) {
      cores = parseInt(cpuResult.stdout.trim(), 10) || 1;
    }
    const modelResult = await shell(
      "sh",
      ["-c", "cat /proc/cpuinfo 2>/dev/null | grep 'model name' | head -1 | cut -d: -f2"],
      { ignoreError: true, timeout: 5000 },
    );
    if (modelResult.exitCode === 0 && modelResult.stdout.trim()) {
      cpuModel = modelResult.stdout.trim();
    }

    // CPU usage
    let cpuUsage = 0;
    const topResult = await shell(
      "sh",
      ["-c", "top -bn1 2>/dev/null | grep 'Cpu(s)' | awk '{print $2}'"],
      { ignoreError: true, timeout: 5000 },
    );
    if (topResult.exitCode === 0 && topResult.stdout.trim()) {
      cpuUsage = Math.round(parseFloat(topResult.stdout.trim()) || 0);
    }

    // Memory
    let ramTotalGB = 0;
    let ramUsedGB = 0;
    const memResult = await shell(
      "sh",
      ["-c", "free -b 2>/dev/null | grep Mem"],
      { ignoreError: true, timeout: 5000 },
    );
    if (memResult.exitCode === 0 && memResult.stdout.trim()) {
      const parts = memResult.stdout.trim().split(/\s+/);
      ramTotalGB = Math.round((parseInt(parts[1] ?? "0", 10) / (1024 ** 3)) * 10) / 10;
      ramUsedGB = Math.round((parseInt(parts[2] ?? "0", 10) / (1024 ** 3)) * 10) / 10;
    }

    // Disk mounts
    const dfResult = await shell(
      "sh",
      ["-c", "df -B1 --output=target,size,used / 2>/dev/null | tail -n +2"],
      { ignoreError: true, timeout: 5000 },
    );
    const mounts: SystemResources["mounts"] = [];
    if (dfResult.exitCode === 0 && dfResult.stdout.trim()) {
      for (const line of dfResult.stdout.trim().split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          mounts.push({
            path: parts[0],
            totalGB: Math.round((parseInt(parts[1], 10) / (1024 ** 3)) * 10) / 10,
            usedGB: Math.round((parseInt(parts[2], 10) / (1024 ** 3)) * 10) / 10,
          });
        }
      }
    }

    return { cpuModel, cores, cpuUsage, ramTotalGB, ramUsedGB, mounts };
  },
);

export const fetchVersion = createServerFn({ method: "GET" }).handler(
  async (): Promise<VersionInfo> => {
    await ensureSession();
    const projectRoot = getProjectRoot();

    // Read version from cli/package.json
    let version = "0.0.0";
    try {
      const pkgPath = resolve(projectRoot, "cli/package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      version = pkg.version ?? "0.0.0";
    } catch {
      // ignore
    }

    // Get git commit
    let gitCommit = "unknown";
    const gitResult = await shell("git", ["rev-parse", "--short", "HEAD"], {
      ignoreError: true,
      timeout: 5000,
    });
    if (gitResult.exitCode === 0) {
      gitCommit = gitResult.stdout.trim();
    }

    // Get build date from git
    let buildDate = new Date().toISOString().split("T")[0];
    const dateResult = await shell(
      "git",
      ["log", "-1", "--format=%ci"],
      { ignoreError: true, timeout: 5000 },
    );
    if (dateResult.exitCode === 0 && dateResult.stdout.trim()) {
      buildDate = dateResult.stdout.trim().split(" ")[0];
    }

    return { version, gitCommit, buildDate };
  },
);

export const updateConfig = createServerFn({ method: "POST" })
  .inputValidator((d: { changes: Partial<SystemConfig> }) => d)
  .handler(async ({ data }) => {
    await ensureSession();
    const { changes } = data;
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);

    // Map UI config keys to .env keys
    if (changes.timezone !== undefined) envConfig.TZ = changes.timezone;
    if (changes.puid !== undefined) envConfig.PUID = String(changes.puid);
    if (changes.pgid !== undefined) envConfig.PGID = String(changes.pgid);
    if (changes.httpsEnabled !== undefined) envConfig.ENABLE_HTTPS = String(changes.httpsEnabled);
    if (changes.firewallEnabled !== undefined) envConfig.ENABLE_FIREWALL = String(changes.firewallEnabled);
    if (changes.acmeEmail !== undefined) envConfig.ACME_EMAIL = changes.acmeEmail;
    if (changes.backupDir !== undefined) envConfig.BACKUP_DIR = changes.backupDir;
    if (changes.backupHour !== undefined) envConfig.BACKUP_HOUR = String(changes.backupHour);
    if (changes.localRetention !== undefined) envConfig.LOCAL_RETENTION = String(changes.localRetention);
    if (changes.remoteRetention !== undefined) envConfig.REMOTE_RETENTION = String(changes.remoteRetention);

    await saveEnvConfig(envConfig, projectRoot);
  });
