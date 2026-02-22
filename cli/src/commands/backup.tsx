import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage, ConfirmInput } from "@inkjs/ui";
import { loadBackupConfig, getProjectRoot } from "@/lib/config.js";
import {
  APP_REGISTRY,
  getApp,
  getConfigPaths,
  getComposePath,
} from "@/lib/apps.js";
import { createBackup, createSecretsBackup } from "@/lib/tar.js";
import {
  upload,
  download,
  rotateRemote,
  isRcloneInstalled,
  isRcloneRemoteConfigured,
  purgeRemote,
  listDirs,
  listFiles,
} from "@/lib/rclone.js";
import { shell } from "@/lib/shell.js";
import { createBackupLogger, Logger } from "@/lib/logger.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";
import { ProgressBar } from "@/components/ProgressBar.js";
import type { BackupConfig } from "@/types.js";
import type { AppDefinition } from "@/types.js";
import { existsSync } from "fs";

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Create backup directory structure (matches bash load_config) */
async function ensureBackupDirs(backupDir: string): Promise<void> {
  if (!existsSync(backupDir)) {
    await shell(
      "mkdir",
      ["-p", `${backupDir}/latest`, `${backupDir}/archive`],
      { sudo: true },
    );
    const { stdout: user } = await shell("id", ["-un"]);
    const { stdout: group } = await shell("id", ["-gn"]);
    await shell(
      "chown",
      ["-R", `${user.trim()}:${group.trim()}`, backupDir],
      { sudo: true },
    );
  } else {
    // Try without sudo first, fall back to sudo (matches bash)
    const result = await shell(
      "mkdir",
      ["-p", `${backupDir}/latest`, `${backupDir}/archive`],
      { ignoreError: true },
    );
    if (result.exitCode !== 0) {
      await shell(
        "mkdir",
        ["-p", `${backupDir}/latest`, `${backupDir}/archive`],
        { sudo: true },
      );
      const { stdout: user } = await shell("id", ["-un"]);
      const { stdout: group } = await shell("id", ["-gn"]);
      await shell(
        "chown",
        ["-R", `${user.trim()}:${group.trim()}`, backupDir],
        { sudo: true },
      );
    }
  }
}

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

/**
 * Rotate local backups: keep only LOCAL_RETENTION most recent.
 * Returns the number of deleted directories.
 */
async function rotateLocalBackups(
  config: BackupConfig,
  logger?: Logger,
): Promise<number> {
  if (logger)
    await logger.info(
      `Rotating local backups (keeping ${config.LOCAL_RETENTION} most recent)...`,
    );

  const archiveBase = `${config.BACKUP_DIR}/archive`;

  const result = await shell("ls", ["-1", archiveBase], { ignoreError: true });
  if (result.exitCode !== 0 || !result.stdout.trim()) return 0;

  const dirs = result.stdout
    .trim()
    .split("\n")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  if (dirs.length <= config.LOCAL_RETENTION) {
    if (logger)
      await logger.info(
        `Only ${dirs.length} backup(s) found, no rotation needed`,
      );
    return 0;
  }

  const toDelete = dirs.slice(0, dirs.length - config.LOCAL_RETENTION);
  if (logger) await logger.info(`Deleting ${toDelete.length} oldest backup(s)...`);
  for (const dir of toDelete) {
    await shell("rm", ["-rf", `${archiveBase}/${dir}`], { sudo: true });
    if (logger) await logger.info(`Deleted old backup: ${dir}`);
  }
  if (logger) await logger.info("Local backup rotation complete");
  return toDelete.length;
}

// ─── Headless (non-TTY) backup ───────────────────────────────────────────────

async function runHeadlessBackup(appFilter?: string): Promise<void> {
  const logger = createBackupLogger();
  await logger.info("=== Starting backup process ===");

  try {
    const config = await loadBackupConfig();
    const projectRoot = getProjectRoot();
    const today = new Date().toISOString().slice(0, 10);
    const archiveDir = `${config.BACKUP_DIR}/archive/${today}`;
    const latestDir = `${config.BACKUP_DIR}/latest`;

    // Create backup directory structure
    await ensureBackupDirs(config.BACKUP_DIR);
    await shell("mkdir", ["-p", archiveDir]);

    // Determine which apps to backup
    let apps: AppDefinition[];
    if (appFilter) {
      const app = getApp(appFilter);
      if (!app) {
        await logger.error(`Unknown app: ${appFilter}`);
        process.exit(1);
      }
      apps = [app];
      await logger.info(`Backing up single app: ${appFilter}`);
    } else {
      apps = await detectInstalledApps(config);
      if (apps.length === 0) {
        await logger.warn("No apps detected, nothing to backup");
        process.exit(0);
      }
      if (config.APPS === "auto") {
        await logger.info(
          `Auto-detecting installed apps...\nDetected apps: ${apps.map((a) => a.name).join(", ")}`,
        );
      } else {
        await logger.info(
          `Using configured apps: ${apps.map((a) => a.name).join(", ")}`,
        );
      }
    }

    await logger.info(
      "Note: Media files in the data directory are not included in backups by design (too large). Only app configs and databases are saved.",
    );

    // Backup each app
    const failed: string[] = [];
    for (const app of apps) {
      try {
        await logger.info(`Backing up ${app.name}...`);
        const outputPath = `${archiveDir}/${app.name}.tar.zst`;
        await createBackup(app, config.BASE_DIR, outputPath);

        // Update latest symlink
        await shell("ln", [
          "-sf",
          outputPath,
          `${latestDir}/${app.name}.tar.zst`,
        ]);

        await logger.info(
          `Successfully backed up ${app.name} to ${outputPath}`,
        );
      } catch (err: any) {
        failed.push(app.name);
        await logger.warn(`Failed to create backup for ${app.name}: ${err.message}`);
      }
    }

    // Backup secrets
    try {
      await logger.info("Backing up secrets...");
      const secretsPath = `${archiveDir}/secrets.tar.zst`;
      await createSecretsBackup(projectRoot, secretsPath);
      await shell("ln", [
        "-sf",
        secretsPath,
        `${latestDir}/secrets.tar.zst`,
      ]);
      await logger.info(
        `Successfully backed up secrets to ${secretsPath}`,
      );
    } catch (err: any) {
      await logger.warn(`Failed to create secrets backup: ${err.message}`);
    }

    // Rotate local backups
    await rotateLocalBackups(config, logger);

    // Upload to remote
    if (await isRcloneInstalled()) {
      const remoteCheck = await isRcloneRemoteConfigured(config.RCLONE_REMOTE);
      if (remoteCheck.configured) {
        try {
          await logger.info(
            `Uploading backup to remote (${config.RCLONE_REMOTE})...`,
          );
          await upload(
            archiveDir,
            config.RCLONE_REMOTE,
            `/backups/archive/${today}`,
          );
          await logger.info("Successfully uploaded backup to remote");
        } catch (err: any) {
          await logger.warn(
            `Failed to upload backup to remote: ${err.message}${err.stderr ? `\n  stderr: ${err.stderr}` : ""}`,
          );
        }

        // Rotate remote backups
        try {
          await logger.info(
            `Rotating remote backups (keeping ${config.REMOTE_RETENTION} most recent)...`,
          );
          const deleted = await rotateRemote(
            config.RCLONE_REMOTE,
            "/backups/archive",
            config.REMOTE_RETENTION,
          );
          if (deleted.length > 0) {
            for (const dir of deleted) {
              await logger.info(`Deleted old remote backup: ${dir}`);
            }
          } else {
            await logger.info("No remote rotation needed");
          }
          await logger.info("Remote backup rotation complete");
        } catch (err: any) {
          await logger.warn(`Remote rotation failed: ${err.message}${err.stderr ? `\n  stderr: ${err.stderr}` : ""}`);
        }
      } else {
        await logger.warn(
          `rclone remote '${config.RCLONE_REMOTE}' not configured, skipping remote upload`,
        );
        await logger.warn(remoteCheck.reason);
      }
    } else {
      await logger.warn("rclone not found, skipping remote upload");
    }

    // Summary
    await logger.info("=== Backup process complete ===");
    if (failed.length > 0) {
      await logger.warn(
        `Some apps failed to backup: ${failed.join(", ")}`,
      );
      process.exit(1);
    } else {
      await logger.info("All apps backed up successfully");
    }
  } catch (err: any) {
    await logger.error(`Backup failed: ${err.message}`);
    process.exit(1);
  }
}

// ─── Interactive (TTY) backup ────────────────────────────────────────────────

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

function BackupInteractive({ appFilter }: { appFilter?: string }) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"init" | "running" | "done">("init");
  const [currentLabel, setCurrentLabel] = useState("Loading configuration...");
  const [failedCount, setFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [appProgress, setAppProgress] = useState({ current: 0, total: 0 });

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

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

      // Create backup directory structure
      await ensureBackupDirs(config.BACKUP_DIR);
      await shell("mkdir", ["-p", archiveDir]);

      setPhase("running");

      // Determine which apps to backup
      let apps: AppDefinition[];
      if (appFilter) {
        const app = getApp(appFilter);
        if (!app) {
          setError(`Unknown app: ${appFilter}`);
          return;
        }
        apps = [app];
      } else {
        setCurrentLabel("Detecting installed apps...");
        apps = await detectInstalledApps(config);
        if (apps.length === 0) {
          addStep({
            name: "Detection",
            status: "skipped",
            message: "No apps found",
          });
          setPhase("done");
          setTimeout(() => exit(), 500);
          return;
        }
        addStep({
          name: "Detection",
          status: "done",
          message: `Found ${apps.length} app(s): ${apps.map((a) => a.name).join(", ")}`,
        });
      }

      addStep({
        name: "Note",
        status: "skipped",
        message:
          "Media files in the data directory are not included (too large). Only app configs and databases are saved.",
      });

      let failed = 0;
      setAppProgress({ current: 0, total: apps.length });

      // Backup each app
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        setAppProgress({ current: i, total: apps.length });
        setCurrentLabel(`Backing up ${app.displayName}...`);
        try {
          const outputPath = `${archiveDir}/${app.name}.tar.zst`;
          await createBackup(app, config.BASE_DIR, outputPath);
          await shell("ln", [
            "-sf",
            outputPath,
            `${latestDir}/${app.name}.tar.zst`,
          ]);
          addStep({ name: app.displayName, status: "done" });
        } catch (err: any) {
          addStep({
            name: app.displayName,
            status: "error",
            message: err.message,
          });
          failed++;
        }
      }

      // Backup secrets
      setCurrentLabel("Backing up secrets...");
      try {
        const secretsPath = `${archiveDir}/secrets.tar.zst`;
        await createSecretsBackup(projectRoot, secretsPath);
        await shell("ln", [
          "-sf",
          secretsPath,
          `${latestDir}/secrets.tar.zst`,
        ]);
        addStep({ name: "Secrets", status: "done" });
      } catch (err: any) {
        addStep({
          name: "Secrets",
          status: "error",
          message: err.message,
        });
      }

      // Rotate local backups
      setCurrentLabel(
        `Rotating local backups (keeping ${config.LOCAL_RETENTION} most recent)...`,
      );
      const rotatedCount = await rotateLocalBackups(config);
      if (rotatedCount > 0) {
        addStep({
          name: "Local rotation",
          status: "done",
          message: `Removed ${rotatedCount} old backup(s)`,
        });
      } else {
        addStep({
          name: "Local rotation",
          status: "done",
          message: "No rotation needed",
        });
      }

      // Upload + rotate remote
      if (await isRcloneInstalled()) {
        const remoteCheck = await isRcloneRemoteConfigured(config.RCLONE_REMOTE);
        if (remoteCheck.configured) {
          // Upload
          setCurrentLabel(
            `Uploading to ${config.RCLONE_REMOTE}...`,
          );
          try {
            await upload(
              archiveDir,
              config.RCLONE_REMOTE,
              `/backups/archive/${today}`,
            );
            addStep({ name: "Remote upload", status: "done" });
          } catch (err: any) {
            addStep({
              name: "Remote upload",
              status: "error",
              message: err.stderr?.trim() || err.message,
            });
          }

          // Rotate remote
          setCurrentLabel(
            `Rotating remote backups (keeping ${config.REMOTE_RETENTION} most recent)...`,
          );
          try {
            const deleted = await rotateRemote(
              config.RCLONE_REMOTE,
              "/backups/archive",
              config.REMOTE_RETENTION,
            );
            if (deleted.length > 0) {
              addStep({
                name: "Remote rotation",
                status: "done",
                message: `Removed ${deleted.length} old backup(s)`,
              });
            } else {
              addStep({
                name: "Remote rotation",
                status: "done",
                message: "No rotation needed",
              });
            }
          } catch (err: any) {
            addStep({
              name: "Remote rotation",
              status: "error",
              message: err.stderr?.trim() || err.message,
            });
          }
        } else {
          addStep({
            name: "Remote backup",
            status: "skipped",
            message: remoteCheck.reason,
          });
        }
      } else {
        addStep({
          name: "Remote backup",
          status: "skipped",
          message: "rclone not installed",
        });
      }

      setFailedCount(failed);
      setPhase("done");
      setTimeout(() => {
        process.exitCode = failed > 0 ? 1 : 0;
        exit();
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => {
        process.exitCode = 1;
        exit();
      }, 500);
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

      {/* Persistent completed steps */}
      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {/* Current active phase with spinner */}
      {phase === "running" && (
        <Box flexDirection="column">
          <Text>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {" "}{currentLabel}
          </Text>
          {appProgress.total > 1 && (
            <ProgressBar
              percent={(appProgress.current / appProgress.total) * 100}
              label={`${appProgress.current}/${appProgress.total} apps`}
            />
          )}
        </Box>
      )}

      {/* Final summary */}
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
    </Box>
  );
}

// ─── Backup deletion ─────────────────────────────────────────────────────────

/**
 * List local backup dates (YYYY-MM-DD directories in archive/).
 */
async function listLocalBackupDates(backupDir: string): Promise<string[]> {
  const archiveBase = `${backupDir}/archive`;
  const result = await shell("ls", ["-1", archiveBase], { ignoreError: true });
  if (result.exitCode !== 0 || !result.stdout.trim()) return [];
  return result.stdout
    .trim()
    .split("\n")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
}

/**
 * Delete local backups. If date is specified, delete only that date's backup.
 * Otherwise delete all local backups (archive/ and latest/).
 */
async function deleteLocalBackups(
  backupDir: string,
  date?: string,
): Promise<{ deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];

  if (date) {
    const archivePath = `${backupDir}/archive/${date}`;
    const result = await shell("ls", [archivePath], { ignoreError: true });
    if (result.exitCode !== 0) {
      errors.push(`Local backup not found for date: ${date}`);
      return { deleted, errors };
    }
    await shell("rm", ["-rf", archivePath], { sudo: true });
    deleted.push(date);
  } else {
    const dates = await listLocalBackupDates(backupDir);
    if (dates.length === 0) {
      errors.push("No local backups found");
      return { deleted, errors };
    }
    for (const d of dates) {
      await shell("rm", ["-rf", `${backupDir}/archive/${d}`], { sudo: true });
      deleted.push(d);
    }
    // Also clear the latest/ symlinks
    await shell("rm", ["-rf", `${backupDir}/latest`], { sudo: true });
    await shell("mkdir", ["-p", `${backupDir}/latest`], { sudo: true });
  }

  return { deleted, errors };
}

/**
 * Delete remote backups. If date is specified, delete only that date's backup.
 * Otherwise delete all remote backups.
 */
async function deleteRemoteBackups(
  rcloneRemote: string,
  date?: string,
): Promise<{ deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];

  if (!(await isRcloneInstalled())) {
    errors.push("rclone is not installed");
    return { deleted, errors };
  }

  const remoteCheck = await isRcloneRemoteConfigured(rcloneRemote);
  if (!remoteCheck.configured) {
    errors.push(`rclone remote '${rcloneRemote}' not configured: ${remoteCheck.reason}`);
    return { deleted, errors };
  }

  if (date) {
    try {
      await purgeRemote(rcloneRemote, `/backups/archive/${date}`);
      deleted.push(date);
    } catch (err: any) {
      errors.push(`Failed to delete remote backup ${date}: ${err.message}`);
    }
  } else {
    const dirs = await listDirs(rcloneRemote, "/backups/archive");
    if (dirs.length === 0) {
      errors.push("No remote backups found");
      return { deleted, errors };
    }
    for (const d of dirs) {
      try {
        await purgeRemote(rcloneRemote, `/backups/archive/${d}`);
        deleted.push(d);
      } catch (err: any) {
        errors.push(`Failed to delete remote backup ${d}: ${err.message}`);
      }
    }
  }

  return { deleted, errors };
}

function BackupDelete({
  target,
  date,
  skipConfirm,
}: {
  target: "local" | "remote";
  date?: string;
  skipConfirm: boolean;
}) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"confirm" | "running" | "done">(
    skipConfirm ? "running" : "confirm",
  );
  const [results, setResults] = useState<{ deleted: string[]; errors: string[] }>({
    deleted: [],
    errors: [],
  });

  const description = date
    ? `${target} backup for ${date}`
    : `all ${target} backups`;

  useEffect(() => {
    if (phase === "running") {
      performDelete();
    }
  }, [phase]);

  async function performDelete() {
    try {
      const config = await loadBackupConfig();
      let result: { deleted: string[]; errors: string[] };
      if (target === "local") {
        result = await deleteLocalBackups(config.BACKUP_DIR, date);
      } else {
        result = await deleteRemoteBackups(config.RCLONE_REMOTE, date);
      }
      setResults(result);
      setPhase("done");
      setTimeout(() => {
        process.exitCode = result.errors.length > 0 && result.deleted.length === 0 ? 1 : 0;
        exit();
      }, 500);
    } catch (err: any) {
      setResults({ deleted: [], errors: [err.message] });
      setPhase("done");
      setTimeout(() => {
        process.exitCode = 1;
        exit();
      }, 500);
    }
  }

  return (
    <Box flexDirection="column">
      <Header title="Backup Delete" />

      {phase === "confirm" && (
        <Box flexDirection="column">
          <Text>
            Are you sure you want to delete {description}? This cannot be undone.
          </Text>
          <ConfirmInput
            onConfirm={() => setPhase("running")}
            onCancel={() => {
              exit();
            }}
          />
        </Box>
      )}

      {phase === "running" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Deleting {description}...
        </Text>
      )}

      {phase === "done" && (
        <Box flexDirection="column">
          {results.deleted.length > 0 && (
            <StatusMessage variant="success">
              Deleted {results.deleted.length} {target} backup(s): {results.deleted.join(", ")}
            </StatusMessage>
          )}
          {results.errors.map((err, i) => (
            <StatusMessage key={i} variant="error">
              {err}
            </StatusMessage>
          ))}
          {results.deleted.length === 0 && results.errors.length === 0 && (
            <StatusMessage variant="info">Nothing to delete</StatusMessage>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runBackupDelete(
  args: string[],
  flags: { yes?: boolean },
): Promise<void> {
  const target = args[0];
  const date = args[1];

  if (target !== "local" && target !== "remote") {
    console.error(
      'Usage: mithrandir backup delete <local|remote> [YYYY-MM-DD]\n\nSpecify "local" or "remote" as the target.',
    );
    process.exit(1);
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`Invalid date format: ${date}\nExpected: YYYY-MM-DD`);
    process.exit(1);
  }

  const { waitUntilExit } = render(
    <BackupDelete target={target} date={date} skipConfirm={!!flags.yes} />,
  );
  await waitUntilExit();
}

// ─── Backup listing ──────────────────────────────────────────────────────────

/** Strip .tar.zst suffix for display */
function stripArchiveSuffix(filename: string): string {
  return filename.replace(/\.tar\.zst$/, "");
}

/** List contents of local backup date directories */
async function listLocalBackupContents(
  backupDir: string,
  date: string,
): Promise<string[]> {
  const dir = `${backupDir}/archive/${date}`;
  const result = await shell("ls", ["-1", dir], { ignoreError: true });
  if (result.exitCode !== 0 || !result.stdout.trim()) return [];
  return result.stdout
    .trim()
    .split("\n")
    .filter((f) => f.endsWith(".tar.zst"))
    .map(stripArchiveSuffix)
    .sort();
}

export async function runBackupList(args: string[]): Promise<void> {
  const filter = args[0];

  if (filter !== undefined && filter !== "local" && filter !== "remote") {
    console.error(
      'Usage: mithrandir backup list [local|remote]\n\nOptionally specify "local" or "remote" to filter.',
    );
    process.exit(1);
  }

  const config = await loadBackupConfig();
  const showLocal = !filter || filter === "local";
  const showRemote = !filter || filter === "remote";

  if (showLocal) {
    console.log("Local backups:");
    const dates = await listLocalBackupDates(config.BACKUP_DIR);
    if (dates.length === 0) {
      console.log("  No local backups found.\n");
    } else {
      for (const date of dates) {
        console.log(`  ${date}`);
        const contents = await listLocalBackupContents(config.BACKUP_DIR, date);
        if (contents.length > 0) {
          console.log(`    ${contents.join(", ")}`);
        }
      }
      console.log();
    }
  }

  if (showRemote) {
    console.log(`Remote backups (${config.RCLONE_REMOTE}):`);

    if (!(await isRcloneInstalled())) {
      console.log("  rclone is not installed.\n");
      return;
    }

    const remoteCheck = await isRcloneRemoteConfigured(config.RCLONE_REMOTE);
    if (!remoteCheck.configured) {
      console.log(`  rclone remote '${config.RCLONE_REMOTE}' not configured.\n`);
      return;
    }

    const dates = await listDirs(config.RCLONE_REMOTE, "/backups/archive");
    if (dates.length === 0) {
      console.log("  No remote backups found.\n");
    } else {
      for (const date of dates) {
        console.log(`  ${date}`);
        const files = await listFiles(
          config.RCLONE_REMOTE,
          `/backups/archive/${date}`,
        );
        const contents = files
          .filter((f) => f.endsWith(".tar.zst"))
          .map(stripArchiveSuffix)
          .sort();
        if (contents.length > 0) {
          console.log(`    ${contents.join(", ")}`);
        }
      }
      console.log();
    }
  }
}

export async function runBackup(
  flags: { yes?: boolean },
  appFilter?: string,
): Promise<void> {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(
      <BackupInteractive appFilter={appFilter} />,
    );
    await waitUntilExit();
  } else {
    await runHeadlessBackup(appFilter);
  }
}

// ─── Backup verification ──────────────────────────────────────────────────────

interface VerifyResult {
  file: string;
  appName: string;
  status: "ok" | "error";
  checks: string[];
  errors: string[];
}

/**
 * Verify a single .tar.zst archive:
 * 1. Size > 0
 * 2. Archive integrity (tar --zstd -tf)
 * 3. Expected files present
 * 4. Optional extract test
 */
async function verifyArchive(
  archivePath: string,
  doExtract: boolean,
): Promise<VerifyResult> {
  const filename = archivePath.split("/").pop()!;
  const appName = stripArchiveSuffix(filename);
  const checks: string[] = [];
  const errors: string[] = [];

  // 1. Size check
  const statResult = await shell("stat", ["-c", "%s", archivePath], {
    ignoreError: true,
  });
  if (statResult.exitCode !== 0) {
    errors.push("Could not stat file");
    return { file: filename, appName, status: "error", checks, errors };
  }
  const size = parseInt(statResult.stdout.trim(), 10);
  if (size === 0) {
    errors.push("File is empty (0 bytes)");
    return { file: filename, appName, status: "error", checks, errors };
  }
  checks.push(`Size: ${formatBytes(size)}`);

  // 2. Archive integrity — list contents
  const listResult = await shell("tar", ["--zstd", "-tf", archivePath], {
    ignoreError: true,
  });
  if (listResult.exitCode !== 0) {
    errors.push(
      `Archive corrupt: tar -tf failed (exit ${listResult.exitCode})`,
    );
    return { file: filename, appName, status: "error", checks, errors };
  }
  checks.push("Archive integrity OK");

  const contents = listResult.stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  // 3. Expected file presence
  if (appName === "secrets") {
    // Secrets archive should contain .env
    if (contents.some((f) => f === ".env" || f.endsWith("/.env"))) {
      checks.push("Contains .env");
    } else {
      errors.push("Missing .env in secrets archive");
    }
  } else {
    const app = getApp(appName);
    if (app) {
      // Check for docker-compose.yml
      const composeEntry = `${app.name}/docker-compose.yml`;
      if (contents.some((f) => f === composeEntry)) {
        checks.push("Contains docker-compose.yml");
      } else {
        errors.push(`Missing ${composeEntry}`);
      }

      // Check for config dir(s)
      if (app.configSubdir === "multiple" && app.multipleConfigDirs) {
        for (const dir of app.multipleConfigDirs) {
          const prefix = `${app.name}/${dir}/`;
          if (contents.some((f) => f === `${app.name}/${dir}` || f.startsWith(prefix))) {
            checks.push(`Contains ${dir}/`);
          } else {
            errors.push(`Missing config dir: ${dir}/`);
          }
        }
      } else {
        const prefix = `${app.name}/${app.configSubdir}/`;
        if (contents.some((f) => f === `${app.name}/${app.configSubdir}` || f.startsWith(prefix))) {
          checks.push(`Contains ${app.configSubdir}/`);
        } else {
          errors.push(`Missing config dir: ${app.configSubdir}/`);
        }
      }
    } else {
      checks.push(`Unknown app "${appName}", skipping file checks`);
    }
  }

  // 4. Extract test
  if (doExtract) {
    const tmpResult = await shell("mktemp", ["-d", "/tmp/mithrandir-extract-XXXXXX"]);
    const tmpDir = tmpResult.stdout.trim();
    try {
      const extractResult = await shell(
        "tar",
        ["--zstd", "-xf", archivePath, "-C", tmpDir],
        { ignoreError: true },
      );
      if (extractResult.exitCode !== 0) {
        errors.push(
          `Extract test failed (exit ${extractResult.exitCode})`,
        );
      } else {
        checks.push("Extract test OK");
      }
    } finally {
      await shell("rm", ["-rf", tmpDir], { ignoreError: true });
    }
  }

  return {
    file: filename,
    appName,
    status: errors.length > 0 ? "error" : "ok",
    checks,
    errors,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function BackupVerify({
  date,
  remote,
  doExtract,
}: {
  date?: string;
  remote: boolean;
  doExtract: boolean;
}) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"running" | "done">("running");
  const [currentLabel, setCurrentLabel] = useState("Loading configuration...");
  const [errorCount, setErrorCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    runVerify();
  }, []);

  async function runVerify() {
    try {
      const config = await loadBackupConfig();
      let resolvedDate = date;
      let archiveDir: string;
      let tmpDir: string | undefined;

      if (remote) {
        // Remote verification
        if (!(await isRcloneInstalled())) {
          setError("rclone is not installed");
          return;
        }
        const remoteCheck = await isRcloneRemoteConfigured(config.RCLONE_REMOTE);
        if (!remoteCheck.configured) {
          setError(`rclone remote '${config.RCLONE_REMOTE}' not configured: ${remoteCheck.reason}`);
          return;
        }

        if (!resolvedDate) {
          setCurrentLabel("Finding most recent remote backup...");
          const dates = await listDirs(config.RCLONE_REMOTE, "/backups/archive");
          if (dates.length === 0) {
            setError("No remote backups found");
            return;
          }
          resolvedDate = dates[dates.length - 1];
        }

        setCurrentLabel(`Downloading remote backup ${resolvedDate}...`);
        const mkResult = await shell("mktemp", ["-d", "/tmp/mithrandir-verify-XXXXXX"]);
        tmpDir = mkResult.stdout.trim();
        archiveDir = tmpDir;

        try {
          await download(
            config.RCLONE_REMOTE,
            `/backups/archive/${resolvedDate}`,
            tmpDir,
          );
        } catch (err: any) {
          await shell("rm", ["-rf", tmpDir], { ignoreError: true });
          setError(`Failed to download remote backup: ${err.message}`);
          return;
        }

        addStep({
          name: "Download",
          status: "done",
          message: `Downloaded ${resolvedDate} from ${config.RCLONE_REMOTE}`,
        });
      } else {
        // Local verification
        if (!resolvedDate) {
          setCurrentLabel("Finding most recent local backup...");
          const dates = await listLocalBackupDates(config.BACKUP_DIR);
          if (dates.length === 0) {
            setError("No local backups found");
            return;
          }
          resolvedDate = dates[dates.length - 1];
        }

        archiveDir = `${config.BACKUP_DIR}/archive/${resolvedDate}`;
        const checkResult = await shell("ls", [archiveDir], { ignoreError: true });
        if (checkResult.exitCode !== 0) {
          setError(`Backup not found for date: ${resolvedDate}`);
          return;
        }
      }

      addStep({
        name: "Date",
        status: "done",
        message: `Verifying ${remote ? "remote" : "local"} backup: ${resolvedDate}`,
      });

      // Find all .tar.zst files
      const lsResult = await shell("ls", ["-1", archiveDir], { ignoreError: true });
      if (lsResult.exitCode !== 0 || !lsResult.stdout.trim()) {
        setError(`No files found in ${archiveDir}`);
        if (tmpDir) await shell("rm", ["-rf", tmpDir], { ignoreError: true });
        return;
      }

      const archives = lsResult.stdout
        .trim()
        .split("\n")
        .filter((f) => f.endsWith(".tar.zst"));

      if (archives.length === 0) {
        setError("No .tar.zst archives found");
        if (tmpDir) await shell("rm", ["-rf", tmpDir], { ignoreError: true });
        return;
      }

      // Verify each archive
      let errors = 0;
      for (const archive of archives) {
        const appName = stripArchiveSuffix(archive);
        setCurrentLabel(`Verifying ${appName}...`);
        const result = await verifyArchive(
          `${archiveDir}/${archive}`,
          doExtract,
        );

        if (result.status === "ok") {
          addStep({
            name: result.appName,
            status: "done",
            message: result.checks.join(", "),
          });
        } else {
          addStep({
            name: result.appName,
            status: "error",
            message: [...result.errors, ...result.checks].join(", "),
          });
          errors++;
        }
      }

      // Clean up temp dir
      if (tmpDir) {
        await shell("rm", ["-rf", tmpDir], { ignoreError: true });
      }

      setErrorCount(errors);
      setPhase("done");
      setTimeout(() => {
        process.exitCode = errors > 0 ? 1 : 0;
        exit();
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => {
        process.exitCode = 1;
        exit();
      }, 500);
    }
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Backup Verify" />
        <StatusMessage variant="error">Verification failed: {error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Backup Verify" />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {phase === "running" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{currentLabel}
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          {errorCount > 0 ? (
            <StatusMessage variant="warning">
              Verification completed with {errorCount} error(s)
            </StatusMessage>
          ) : (
            <StatusMessage variant="success">
              All archives verified successfully
            </StatusMessage>
          )}
        </Box>
      )}
    </Box>
  );
}

async function runHeadlessVerify(
  date?: string,
  remote?: boolean,
  doExtract?: boolean,
): Promise<void> {
  const config = await loadBackupConfig();
  let resolvedDate = date;
  let archiveDir: string;
  let tmpDir: string | undefined;

  if (remote) {
    if (!(await isRcloneInstalled())) {
      console.error("Error: rclone is not installed");
      process.exit(1);
    }
    const remoteCheck = await isRcloneRemoteConfigured(config.RCLONE_REMOTE);
    if (!remoteCheck.configured) {
      console.error(
        `Error: rclone remote '${config.RCLONE_REMOTE}' not configured: ${remoteCheck.reason}`,
      );
      process.exit(1);
    }

    if (!resolvedDate) {
      const dates = await listDirs(config.RCLONE_REMOTE, "/backups/archive");
      if (dates.length === 0) {
        console.error("Error: No remote backups found");
        process.exit(1);
      }
      resolvedDate = dates[dates.length - 1];
    }

    console.log(`Downloading remote backup ${resolvedDate}...`);
    const mkResult = await shell("mktemp", ["-d", "/tmp/mithrandir-verify-XXXXXX"]);
    tmpDir = mkResult.stdout.trim();
    archiveDir = tmpDir;

    try {
      await download(
        config.RCLONE_REMOTE,
        `/backups/archive/${resolvedDate}`,
        tmpDir,
      );
    } catch (err: any) {
      await shell("rm", ["-rf", tmpDir], { ignoreError: true });
      console.error(`Error: Failed to download remote backup: ${err.message}`);
      process.exit(1);
    }
  } else {
    if (!resolvedDate) {
      const dates = await listLocalBackupDates(config.BACKUP_DIR);
      if (dates.length === 0) {
        console.error("Error: No local backups found");
        process.exit(1);
      }
      resolvedDate = dates[dates.length - 1];
    }
    archiveDir = `${config.BACKUP_DIR}/archive/${resolvedDate}`;
    const checkResult = await shell("ls", [archiveDir], { ignoreError: true });
    if (checkResult.exitCode !== 0) {
      console.error(`Error: Backup not found for date: ${resolvedDate}`);
      process.exit(1);
    }
  }

  console.log(
    `Verifying ${remote ? "remote" : "local"} backup: ${resolvedDate}`,
  );

  const lsResult = await shell("ls", ["-1", archiveDir], { ignoreError: true });
  if (lsResult.exitCode !== 0 || !lsResult.stdout.trim()) {
    console.error(`Error: No files found in ${archiveDir}`);
    if (tmpDir) await shell("rm", ["-rf", tmpDir], { ignoreError: true });
    process.exit(1);
  }

  const archives = lsResult.stdout
    .trim()
    .split("\n")
    .filter((f) => f.endsWith(".tar.zst"));

  if (archives.length === 0) {
    console.error("Error: No .tar.zst archives found");
    if (tmpDir) await shell("rm", ["-rf", tmpDir], { ignoreError: true });
    process.exit(1);
  }

  let errors = 0;
  for (const archive of archives) {
    const result = await verifyArchive(
      `${archiveDir}/${archive}`,
      !!doExtract,
    );
    if (result.status === "ok") {
      console.log(`  ✓ ${result.appName}: ${result.checks.join(", ")}`);
    } else {
      console.log(
        `  ✗ ${result.appName}: ${[...result.errors, ...result.checks].join(", ")}`,
      );
      errors++;
    }
  }

  if (tmpDir) {
    await shell("rm", ["-rf", tmpDir], { ignoreError: true });
  }

  if (errors > 0) {
    console.log(`\nVerification completed with ${errors} error(s)`);
    process.exit(1);
  } else {
    console.log("\nAll archives verified successfully");
  }
}

export async function runBackupVerify(
  args: string[],
  flags: { remote?: boolean; extract?: boolean },
): Promise<void> {
  const date = args[0];

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`Invalid date format: ${date}\nExpected: YYYY-MM-DD`);
    process.exit(1);
  }

  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(
      <BackupVerify
        date={date}
        remote={!!flags.remote}
        doExtract={!!flags.extract}
      />,
    );
    await waitUntilExit();
  } else {
    await runHeadlessVerify(date, flags.remote, flags.extract);
  }
}
