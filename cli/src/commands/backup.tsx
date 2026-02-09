import React, { useState, useEffect } from "react";
import { render, Box, Text } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { loadBackupConfig, getProjectRoot } from "../lib/config.js";
import {
  APP_REGISTRY,
  getApp,
  getAppDir,
  getConfigPaths,
  getComposePath,
} from "../lib/apps.js";
import { createBackup, createSecretsBackup } from "../lib/tar.js";
import { upload, rotateRemote, isRcloneInstalled } from "../lib/rclone.js";
import { shell } from "../lib/shell.js";
import { createBackupLogger, Logger } from "../lib/logger.js";
import { Header } from "../components/Header.js";
import { AppStatus } from "../components/AppStatus.js";
import type { BackupConfig } from "../types.js";
import type { AppDefinition } from "../types.js";
import { existsSync } from "fs";

// ─── Headless (non-TTY) backup ───────────────────────────────────────────────

async function runHeadlessBackup(): Promise<void> {
  const logger = createBackupLogger();
  await logger.info("Starting backup (headless mode)");

  try {
    const config = await loadBackupConfig();
    const projectRoot = getProjectRoot();
    const today = new Date().toISOString().slice(0, 10);
    const archiveDir = `${config.BACKUP_DIR}/archive/${today}`;
    const latestDir = `${config.BACKUP_DIR}/latest`;

    // Create directories
    await shell("mkdir", ["-p", archiveDir], { sudo: true });
    await shell("mkdir", ["-p", latestDir], { sudo: true });

    // Detect apps
    const apps = await detectInstalledApps(config);
    await logger.info(`Found ${apps.length} installed apps: ${apps.map((a) => a.name).join(", ")}`);

    const failed: string[] = [];

    // Backup each app
    for (const app of apps) {
      try {
        const outputPath = `${archiveDir}/${app.name}.tar.zst`;
        await logger.info(`Backing up ${app.displayName}...`);
        await createBackup(app, config.BASE_DIR, outputPath);

        // Update latest symlink
        const latestLink = `${latestDir}/${app.name}.tar.zst`;
        await shell("rm", ["-f", latestLink], { sudo: true });
        await shell("ln", ["-sf", outputPath, latestLink], { sudo: true });

        await logger.info(`  ✓ ${app.displayName}`);
      } catch (err: any) {
        failed.push(app.name);
        await logger.warn(`  ✗ ${app.displayName}: ${err.message}`);
      }
    }

    // Backup secrets
    try {
      const secretsPath = `${archiveDir}/secrets.tar.zst`;
      await logger.info("Backing up secrets...");
      await createSecretsBackup(projectRoot, secretsPath);
      const latestLink = `${latestDir}/secrets.tar.zst`;
      await shell("rm", ["-f", latestLink], { sudo: true });
      await shell("ln", ["-sf", secretsPath, latestLink], { sudo: true });
      await logger.info("  ✓ secrets");
    } catch (err: any) {
      await logger.warn(`  ✗ secrets: ${err.message}`);
    }

    // Rotate local backups
    await rotateLocalBackups(config, logger);

    // Upload to remote
    if (await isRcloneInstalled()) {
      try {
        await logger.info(`Uploading to ${config.RCLONE_REMOTE}...`);
        await upload(
          archiveDir,
          config.RCLONE_REMOTE,
          `/backups/archive/${today}`,
        );
        await logger.info("Upload complete");

        // Rotate remote
        const deleted = await rotateRemote(
          config.RCLONE_REMOTE,
          "/backups/archive",
          config.REMOTE_RETENTION,
        );
        if (deleted.length > 0) {
          await logger.info(`Rotated ${deleted.length} remote backup(s)`);
        }
      } catch (err: any) {
        await logger.warn(`Remote upload failed: ${err.message}`);
      }
    } else {
      await logger.warn("rclone not installed, skipping remote upload");
    }

    if (failed.length > 0) {
      await logger.error(`Backup completed with failures: ${failed.join(", ")}`);
      process.exit(1);
    } else {
      await logger.info("Backup completed successfully");
    }
  } catch (err: any) {
    await logger.error(`Backup failed: ${err.message}`);
    process.exit(1);
  }
}

// ─── Interactive (TTY) backup ────────────────────────────────────────────────

type AppBackupState = "pending" | "running" | "done" | "error";

interface AppBackupStatus {
  app: AppDefinition;
  state: AppBackupState;
  error?: string;
}

function BackupInteractive() {
  const [phase, setPhase] = useState<
    "detecting" | "backing-up" | "secrets" | "rotating" | "uploading" | "done"
  >("detecting");
  const [appStatuses, setAppStatuses] = useState<AppBackupStatus[]>([]);
  const [currentApp, setCurrentApp] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    runInteractiveBackup();
  }, []);

  async function runInteractiveBackup() {
    try {
      const config = await loadBackupConfig();
      const projectRoot = getProjectRoot();
      const today = new Date().toISOString().slice(0, 10);
      const archiveDir = `${config.BACKUP_DIR}/archive/${today}`;
      const latestDir = `${config.BACKUP_DIR}/latest`;

      await shell("mkdir", ["-p", archiveDir], { sudo: true });
      await shell("mkdir", ["-p", latestDir], { sudo: true });

      // Detect apps
      const apps = await detectInstalledApps(config);
      const statuses: AppBackupStatus[] = apps.map((app) => ({
        app,
        state: "pending" as AppBackupState,
      }));
      setAppStatuses(statuses);
      setPhase("backing-up");

      let failed = 0;

      // Backup each app
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        setCurrentApp(app.displayName);
        statuses[i].state = "running";
        setAppStatuses([...statuses]);

        try {
          const outputPath = `${archiveDir}/${app.name}.tar.zst`;
          await createBackup(app, config.BASE_DIR, outputPath);

          const latestLink = `${latestDir}/${app.name}.tar.zst`;
          await shell("rm", ["-f", latestLink], { sudo: true });
          await shell("ln", ["-sf", outputPath, latestLink], { sudo: true });

          statuses[i].state = "done";
        } catch (err: any) {
          statuses[i].state = "error";
          statuses[i].error = err.message;
          failed++;
        }
        setAppStatuses([...statuses]);
      }

      // Secrets
      setPhase("secrets");
      try {
        const secretsPath = `${archiveDir}/secrets.tar.zst`;
        await createSecretsBackup(projectRoot, secretsPath);
        const latestLink = `${latestDir}/secrets.tar.zst`;
        await shell("rm", ["-f", latestLink], { sudo: true });
        await shell("ln", ["-sf", secretsPath, latestLink], { sudo: true });
      } catch {
        // Non-fatal
      }

      // Rotate local
      setPhase("rotating");
      const logger = createBackupLogger();
      await rotateLocalBackups(config, logger);

      // Upload
      if (await isRcloneInstalled()) {
        setPhase("uploading");
        try {
          await upload(
            archiveDir,
            config.RCLONE_REMOTE,
            `/backups/archive/${today}`,
          );
          await rotateRemote(
            config.RCLONE_REMOTE,
            "/backups/archive",
            config.REMOTE_RETENTION,
          );
        } catch {
          setMessage("Remote upload failed (continuing)");
        }
      }

      setFailedCount(failed);
      setPhase("done");
      if (failed > 0) {
        setTimeout(() => process.exit(1), 100);
      } else {
        setTimeout(() => process.exit(0), 100);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Backup" />
        <StatusMessage variant="error">Backup failed: {error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Backup" />

      {phase === "detecting" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Detecting installed apps...
        </Text>
      )}

      {phase !== "detecting" && (
        <Box flexDirection="column" marginBottom={1}>
          {appStatuses.map((status) => (
            <Box key={status.app.name}>
              {status.state === "running" ? (
                <Text>
                  <Text color="yellow">
                    <Spinner type="dots" />
                  </Text>
                  {" "}{status.app.displayName}
                </Text>
              ) : (
                <AppStatus
                  name={status.app.displayName}
                  status={
                    status.state === "done"
                      ? "done"
                      : status.state === "error"
                        ? "error"
                        : "skipped"
                  }
                  message={status.error}
                />
              )}
            </Box>
          ))}
        </Box>
      )}

      {phase === "secrets" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Backing up secrets...
        </Text>
      )}

      {phase === "rotating" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Rotating old backups...
        </Text>
      )}

      {phase === "uploading" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Uploading to remote...
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          {failedCount > 0 ? (
            <StatusMessage variant="warning">
              Backup completed with {failedCount} failure(s)
            </StatusMessage>
          ) : (
            <StatusMessage variant="success">
              Backup completed successfully
            </StatusMessage>
          )}
        </Box>
      )}

      {message && (
        <Text dimColor>{message}</Text>
      )}
    </Box>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Detect installed apps by checking for docker-compose.yml and config dirs */
async function detectInstalledApps(
  config: BackupConfig,
): Promise<AppDefinition[]> {
  // If APPS is explicitly set (not "auto"), use that list
  if (config.APPS !== "auto") {
    const names = config.APPS.split(",").map((s) => s.trim());
    return names
      .map((name) => getApp(name))
      .filter((app): app is AppDefinition => app !== undefined);
  }

  // Auto-detect: check for docker-compose.yml and config dirs
  const installed: AppDefinition[] = [];
  for (const app of APP_REGISTRY) {
    const appDir = getAppDir(app, config.BASE_DIR);
    const composePath = getComposePath(app, config.BASE_DIR);
    const configPaths = getConfigPaths(app, config.BASE_DIR);

    if (!existsSync(composePath)) continue;

    // Check at least one config path exists
    const hasConfig = configPaths.some((p) => existsSync(p));
    if (hasConfig) {
      installed.push(app);
    }
  }

  return installed;
}

/** Rotate local backups: keep only LOCAL_RETENTION most recent */
async function rotateLocalBackups(
  config: BackupConfig,
  logger: Logger,
): Promise<void> {
  const archiveBase = `${config.BACKUP_DIR}/archive`;

  const result = await shell("ls", ["-1", archiveBase], { ignoreError: true });
  if (result.exitCode !== 0 || !result.stdout.trim()) return;

  const dirs = result.stdout
    .trim()
    .split("\n")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  if (dirs.length > config.LOCAL_RETENTION) {
    const toDelete = dirs.slice(0, dirs.length - config.LOCAL_RETENTION);
    for (const dir of toDelete) {
      await shell("rm", ["-rf", `${archiveBase}/${dir}`], { sudo: true });
      await logger.info(`Rotated local backup: ${dir}`);
    }
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runBackup(
  flags: { yes?: boolean },
): Promise<void> {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(<BackupInteractive />);
    await waitUntilExit();
  } else {
    await runHeadlessBackup();
  }
}
