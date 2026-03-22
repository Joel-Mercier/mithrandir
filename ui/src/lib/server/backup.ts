import { createServerFn } from "@tanstack/react-start";
import { existsSync } from "fs";
import { ensureSession } from "#/lib/auth";
import { getProjectRoot } from "./utils";
import { loadEnvConfig, getBackupConfig } from "@mithrandir/cli/lib/config";
import { shell } from "@mithrandir/cli/lib/shell";
import { isBackupArchive, ENCRYPTED_EXT } from "@mithrandir/cli/lib/backup-utils";
import { listDirs, listFiles, isRcloneRemoteConfigured } from "@mithrandir/cli/lib/rclone";
import type { BackupStatus, BackupEntry } from "#/lib/types";
import { logActivity } from "./activity";

export const fetchBackupStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<BackupStatus> => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);
    const backupConfig = getBackupConfig(envConfig);

    // Find last backup date
    let lastBackupDate = "";
    const archiveDir = `${backupConfig.BACKUP_DIR}/archive`;
    if (existsSync(archiveDir)) {
      const result = await shell("ls", ["-1", archiveDir], { ignoreError: true });
      if (result.exitCode === 0 && result.stdout.trim()) {
        const dates = result.stdout
          .trim()
          .split("\n")
          .filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort()
          .reverse();
        if (dates.length > 0) {
          lastBackupDate = `${dates[0]}T00:00:00Z`;
        }
      }
    }

    return {
      lastBackupDate,
      nextScheduledHour: backupConfig.BACKUP_HOUR,
      localRetention: backupConfig.LOCAL_RETENTION,
      remoteRetention: backupConfig.REMOTE_RETENTION,
      remotes: backupConfig.RCLONE_REMOTES,
      encrypted: !!backupConfig.BACKUP_PASSWORD,
    };
  },
);

export const fetchBackupHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<BackupEntry[]> => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);
    const backupConfig = getBackupConfig(envConfig);

    const entries: BackupEntry[] = [];
    const archiveDir = `${backupConfig.BACKUP_DIR}/archive`;

    // ─── Local backups ───────────────────────────────────────────────
    if (existsSync(archiveDir)) {
      const result = await shell("ls", ["-1", archiveDir], { ignoreError: true });
      if (result.exitCode === 0 && result.stdout.trim()) {
        const dates = result.stdout
          .trim()
          .split("\n")
          .filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort()
          .reverse();

        for (const date of dates) {
          const dateDir = `${archiveDir}/${date}`;
          const lsResult = await shell("ls", ["-1", dateDir], { ignoreError: true });
          if (lsResult.exitCode !== 0 || !lsResult.stdout.trim()) continue;

          const files = lsResult.stdout.trim().split("\n").filter(isBackupArchive);
          if (files.length === 0) continue;

          const duResult = await shell("du", ["-sh", dateDir], {
            sudo: true,
            ignoreError: true,
            timeout: 10000,
          });
          const size = duResult.exitCode === 0 ? duResult.stdout.trim().split(/\s+/)[0] ?? "—" : "—";
          const encrypted = files.some((f: string) => f.endsWith(ENCRYPTED_EXT));

          entries.push({
            date: `${date}T02:00:00Z`,
            size,
            apps: files.length,
            encrypted,
            location: "local",
            verified: false,
          });
        }
      }
    }

    // ─── Remote backups ──────────────────────────────────────────────
    const remotes = backupConfig.RCLONE_REMOTES;
    for (const remote of remotes) {
      try {
        const check = await isRcloneRemoteConfigured(remote, envConfig);
        if (!check.configured) continue;

        const dirs = (await listDirs(remote, "/backups/archive")).reverse();

        for (const date of dirs) {
          try {
            const allFiles = await listFiles(remote, `/backups/archive/${date}`);
            const files = allFiles.filter(isBackupArchive);
            if (files.length === 0) continue;

            const encrypted = files.some((f: string) => f.endsWith(ENCRYPTED_EXT));

            entries.push({
              date: `${date}T02:00:00Z`,
              size: "—",
              apps: files.length,
              encrypted,
              location: "remote",
              remote,
              verified: false,
            });
          } catch {
            // Skip dates we can't list
          }
        }
      } catch {
        // rclone not available or remote unreachable — skip
      }
    }

    return entries;
  },
);

export const triggerBackup = createServerFn({ method: "POST" }).handler(
  async () => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    await shell(
      "bash",
      ["-c", `cd ${projectRoot} && /usr/local/bin/mithrandir backup &`],
      { ignoreError: true, timeout: 5000 },
    );
    await logActivity("backup_triggered", "backup", null, "Triggered backup", "/backup-restore");
    return { started: true };
  },
);

export const verifyBackup = createServerFn({ method: "POST" })
  .inputValidator((d: { date: string; remote?: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; output: string }> => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const { date, remote } = data;

    // Extract YYYY-MM-DD from ISO date
    const dateStr = date.split("T")[0];
    const args = ["backup", "verify", dateStr, "--yes"];
    if (remote) args.push("--remote");

    const result = await shell(
      "/usr/local/bin/mithrandir",
      args,
      { cwd: projectRoot, ignoreError: true, timeout: 120000 },
    );

    return {
      success: result.exitCode === 0,
      output: (result.stdout + result.stderr).trim(),
    };
  });

export const deleteBackup = createServerFn({ method: "POST" })
  .inputValidator((d: { date: string; location: "local" | "remote" }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; output: string }> => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const { date, location } = data;

    const dateStr = date.split("T")[0];
    const result = await shell(
      "/usr/local/bin/mithrandir",
      ["backup", "delete", location, dateStr, "--yes"],
      { cwd: projectRoot, ignoreError: true, timeout: 60000 },
    );

    const success = result.exitCode === 0;
    if (success) {
      await logActivity("backup_deleted", "backup", dateStr, `Deleted ${location} backup ${dateStr}`, "/backup-restore");
    }
    return {
      success,
      output: (result.stdout + result.stderr).trim(),
    };
  });
