import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { ConfirmInput } from "@inkjs/ui";
import { StatusMessage } from "@inkjs/ui";
import { loadEnvConfig, getBackupConfig, getProjectRoot } from "@/lib/config.js";
import {
  APP_REGISTRY,
  getApp,
  getAppNames,
  getConfigPaths,
  getComposePath,
  getContainerName,
} from "@/lib/apps.js";
import { extractBackup } from "@/lib/tar.js";
import { stopContainer, composeUp } from "@/lib/docker.js";
import {
  download,
  listDirs,
  remoteFileExists,
  isRcloneInstalled,
  isRcloneRemoteConfigured,
} from "@/lib/rclone.js";
import { shell } from "@/lib/shell.js";
import { createRestoreLogger, Logger } from "@/lib/logger.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";
import { ProgressBar } from "@/components/ProgressBar.js";
import { decryptFile, isEncryptedBackup } from "@/lib/crypto.js";
import {
  findArchiveFile,
  isBackupArchive,
  stripArchiveSuffix,
  ARCHIVE_EXT,
  ENCRYPTED_EXT,
} from "@/lib/backup-utils.js";
import type { AppDefinition, BackupConfig, EnvConfig } from "@/types.js";
import { existsSync } from "fs";

// ─── Shared helpers ──────────────────────────────────────────────────────────

interface FoundBackup {
  path: string;
  tempDir: string | null;
}

/** Find a backup file for an app, checking local then remote */
async function findBackupFile(
  appName: string,
  dateArg: string | undefined,
  config: BackupConfig,
): Promise<FoundBackup | null> {
  const date = dateArg ?? "latest";

  // Try local latest
  if (date === "latest") {
    const found = findArchiveFile(`${config.BACKUP_DIR}/latest`, appName);
    if (found) {
      return { path: found, tempDir: null };
    }
  }

  // Try local dated
  if (date !== "latest") {
    const found = findArchiveFile(`${config.BACKUP_DIR}/archive/${date}`, appName);
    if (found) {
      return { path: found, tempDir: null };
    }
  }

  // Try local archive for latest
  if (date === "latest") {
    const archiveDir = await resolveArchiveDir("latest", config);
    if (archiveDir) {
      const found = findArchiveFile(archiveDir, appName);
      if (found) {
        return { path: found, tempDir: null };
      }
    }
  }

  // Try remotes (encrypted first, then plain) — try each remote in order
  if (await isRcloneInstalled()) {
    for (const remote of config.RCLONE_REMOTES) {
      try {
        let remoteDate = date;
        if (date === "latest") {
          const dirs = await listDirs(remote, "/backups/archive");
          if (dirs.length > 0) {
            remoteDate = dirs[dirs.length - 1];
          } else {
            continue;
          }
        }

        // Try encrypted first, then plain
        const encPath = `/backups/archive/${remoteDate}/${appName}${ENCRYPTED_EXT}`;
        const plainPath = `/backups/archive/${remoteDate}/${appName}${ARCHIVE_EXT}`;
        let remotePath: string | null = null;

        if (await remoteFileExists(remote, encPath)) {
          remotePath = encPath;
        } else if (await remoteFileExists(remote, plainPath)) {
          remotePath = plainPath;
        }

        if (remotePath) {
          const { stdout: tmpDir } = await shell("mktemp", ["-d"]);
          const tempDir = tmpDir.trim();
          await download(remote, remotePath, tempDir);
          const filename = remotePath.split("/").pop()!;
          return {
            path: `${tempDir}/${filename}`,
            tempDir,
          };
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/** Resolve the archive directory for a given date */
async function resolveArchiveDir(
  date: string,
  config: BackupConfig | null,
): Promise<string | null> {
  if (!config) {
    config = getBackupConfig(await loadEnvConfig());
  }

  if (date !== "latest") {
    const dir = `${config.BACKUP_DIR}/archive/${date}`;
    return existsSync(dir) ? dir : null;
  }

  // Find most recent local archive
  const result = await shell("ls", ["-1", `${config.BACKUP_DIR}/archive`], {
    ignoreError: true,
  });
  if ((result.exitCode ?? 0) !== 0 || !result.stdout.trim()) return null;

  const dirs = result.stdout
    .trim()
    .split("\n")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  if (dirs.length === 0) return null;

  return `${config.BACKUP_DIR}/archive/${dirs[dirs.length - 1]}`;
}

/**
 * Discover available backups for full restore.
 * Checks local first, then remote for apps not found locally (matching bash behavior).
 */
async function findAvailableBackups(
  dateArg: string | undefined,
  config: BackupConfig,
  env?: EnvConfig,
): Promise<{ apps: string[]; archiveDir: string | null }> {
  const date = dateArg ?? "latest";
  const foundApps: string[] = [];

  // Check for secrets + all known apps
  const allNames = ["secrets", ...APP_REGISTRY.map((a) => a.name)];

  // Resolve local archive dir
  let archiveDir: string | null = null;

  if (date === "latest") {
    // Check local latest dir first
    const latestDir = `${config.BACKUP_DIR}/latest`;
    if (existsSync(latestDir)) {
      for (const name of allNames) {
        if (findArchiveFile(latestDir, name)) {
          foundApps.push(name);
        }
      }
    }
    // Also check local archive
    archiveDir = await resolveArchiveDir("latest", config);
    if (archiveDir) {
      for (const name of allNames) {
        if (foundApps.includes(name)) continue;
        if (findArchiveFile(archiveDir, name)) {
          foundApps.push(name);
        }
      }
    }
  } else {
    archiveDir = await resolveArchiveDir(date, config);
    if (archiveDir) {
      for (const name of allNames) {
        if (findArchiveFile(archiveDir, name)) {
          foundApps.push(name);
        }
      }
    }
  }

  // Check remotes for apps not found locally
  if (await isRcloneInstalled()) {
    for (const remote of config.RCLONE_REMOTES) {
      const remoteCheck = await isRcloneRemoteConfigured(remote, env);
      if (!remoteCheck.configured) continue;

      try {
        let remoteDate = date;
        if (date === "latest") {
          const dirs = await listDirs(remote, "/backups/archive");
          if (dirs.length > 0) {
            remoteDate = dirs[dirs.length - 1];
          }
        }

        if (remoteDate !== "latest") {
          for (const name of allNames) {
            if (foundApps.includes(name)) continue;
            const encPath = `/backups/archive/${remoteDate}/${name}${ENCRYPTED_EXT}`;
            const plainPath = `/backups/archive/${remoteDate}/${name}${ARCHIVE_EXT}`;
            if (
              (await remoteFileExists(remote, encPath)) ||
              (await remoteFileExists(remote, plainPath))
            ) {
              foundApps.push(name);
            }
          }
        }
      } catch {
        continue;
      }
    }
  }

  return { apps: foundApps, archiveDir };
}

/** Validate date format */
function isValidDate(date: string): boolean {
  return date === "latest" || /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/** Restore a single app (shared by headless and interactive) */
async function restoreApp(
  app: AppDefinition,
  backupPath: string,
  tempDir: string | null,
  config: BackupConfig,
  logger: Logger,
  password?: string,
): Promise<void> {
  const containerName = getContainerName(app);

  // Stop container
  await logger.info(`Stopping ${app.displayName} container...`);
  await stopContainer(containerName);

  // Remove config dirs
  const configPaths = getConfigPaths(app, config.BASE_DIR);
  await logger.info(`Removing config directories for ${app.displayName}...`);
  for (const p of configPaths) {
    await shell("rm", ["-rf", p], { sudo: true });
  }

  // Decrypt if encrypted
  let extractPath = backupPath;
  if (isEncryptedBackup(backupPath)) {
    if (!password) {
      throw new Error("Backup is encrypted. Set BACKUP_PASSWORD in .env");
    }
    await logger.info(`Decrypting backup for ${app.displayName}...`);
    extractPath = await decryptFile(backupPath, password);
  }

  // Extract backup
  await logger.info(`Extracting backup for ${app.displayName}...`);
  await extractBackup(extractPath, config.BASE_DIR);

  // Clean up decrypted temp file (if we decrypted, remove the plaintext copy)
  if (extractPath !== backupPath) {
    await shell("rm", ["-f", extractPath], { ignoreError: true });
  }

  // Clean up temp dir
  if (tempDir) {
    await shell("rm", ["-rf", tempDir]);
  }

  // Start container
  const composePath = getComposePath(app, config.BASE_DIR);
  if (existsSync(composePath)) {
    await logger.info(`Starting ${app.displayName} container...`);
    await composeUp(composePath);
  }

  await logger.info(`${app.displayName} restored successfully`);
}

// ─── Headless (non-TTY) restore ─────────────────────────────────────────────

async function runHeadlessSingleRestore(
  app: AppDefinition,
  dateArg: string | undefined,
  autoYes: boolean,
): Promise<void> {
  const logger = createRestoreLogger();
  await logger.info(`=== Restoring ${app.displayName} ===`);

  const env = await loadEnvConfig();
  const config = getBackupConfig(env);
  const date = dateArg ?? "latest";

  // Validate date
  if (!isValidDate(date)) {
    await logger.error(`Invalid date format: ${date}. Use YYYY-MM-DD or 'latest'`);
    process.exit(1);
  }

  // Find backup
  await logger.info(`Finding backup for ${app.displayName} (${date})...`);
  const found = await findBackupFile(app.name, dateArg, config);
  if (!found) {
    await logger.error(`No backup found for ${app.displayName} from ${date}`);
    process.exit(1);
  }

  await logger.info(`Found backup: ${found.path}`);
  await logger.info(
    "Note: Media files in the data directory are not included in backups (too large). Only app configs and databases are restored.",
  );

  if (!autoYes) {
    await logger.info("Skipping restore — run with --yes to proceed non-interactively");
    process.exit(0);
  }

  // Check for encrypted backup without password
  if (isEncryptedBackup(found.path) && !config.BACKUP_PASSWORD) {
    await logger.error("Backup is encrypted. Set BACKUP_PASSWORD in .env");
    process.exit(1);
  }

  try {
    await restoreApp(app, found.path, found.tempDir, config, logger, config.BACKUP_PASSWORD);
    await logger.info(`=== Successfully restored ${app.displayName} ===`);
  } catch (err: any) {
    await logger.error(`Failed to restore ${app.displayName}: ${err.message}`);
    process.exit(1);
  }
}

async function runHeadlessFullRestore(
  dateArg: string | undefined,
  autoYes: boolean,
): Promise<void> {
  const logger = createRestoreLogger();
  await logger.info("=== Starting full restore ===");

  const env = await loadEnvConfig();
  const config = getBackupConfig(env);
  const date = dateArg ?? "latest";

  // Validate date
  if (!isValidDate(date)) {
    await logger.error(`Invalid date format: ${date}. Use YYYY-MM-DD or 'latest'`);
    process.exit(1);
  }

  // Discover available backups (local + remote)
  await logger.info(`Finding available backups (${date})...`);
  const { apps: availableApps } = await findAvailableBackups(dateArg, config, env);

  if (availableApps.length === 0) {
    await logger.warn(`No backups found for ${date}`);
    process.exit(0);
  }

  const appNames = availableApps.filter((a) => a !== "secrets");
  await logger.info(`Found ${availableApps.length} backup(s): ${availableApps.join(", ")}`);
  await logger.info(
    "Note: Media files in the data directory are not included in backups (too large). Only app configs and databases are restored.",
  );

  if (!autoYes) {
    await logger.info("Skipping restore — run with --yes to proceed non-interactively");
    process.exit(0);
  }

  const password = config.BACKUP_PASSWORD;

  // Restore secrets first
  if (availableApps.includes("secrets")) {
    try {
      await logger.info("Restoring secrets...");
      const secretsBackup = await findBackupFile("secrets", dateArg, config);
      if (secretsBackup) {
        let extractPath = secretsBackup.path;
        if (isEncryptedBackup(extractPath)) {
          if (!password) {
            await logger.warn("Secrets backup is encrypted but no BACKUP_PASSWORD set, skipping");
          } else {
            await logger.info("Decrypting secrets...");
            extractPath = await decryptFile(extractPath, password);
          }
        }
        if (!isEncryptedBackup(extractPath)) {
          const projectRoot = getProjectRoot();
          await extractBackup(extractPath, projectRoot);
          // Clean up decrypted temp file
          if (extractPath !== secretsBackup.path) {
            await shell("rm", ["-f", extractPath], { ignoreError: true });
          }
          if (secretsBackup.tempDir) {
            await shell("rm", ["-rf", secretsBackup.tempDir]);
          }
          await logger.info("Secrets restored successfully");
        }
      }
    } catch (err: any) {
      await logger.warn(`Failed to restore secrets: ${err.message}`);
    }
  }

  // Restore each app
  const failed: string[] = [];
  for (const appName of appNames) {
    const app = getApp(appName);
    if (!app) continue;

    try {
      await logger.info(`Restoring ${app.displayName}...`);
      const found = await findBackupFile(appName, dateArg, config);
      if (!found) {
        await logger.warn(`Backup not found for ${app.displayName}, skipping`);
        failed.push(appName);
        continue;
      }
      if (isEncryptedBackup(found.path) && !password) {
        await logger.warn(`${app.displayName} backup is encrypted but no BACKUP_PASSWORD set, skipping`);
        failed.push(appName);
        continue;
      }
      await restoreApp(app, found.path, found.tempDir, config, logger, password);
    } catch (err: any) {
      failed.push(appName);
      await logger.warn(`Failed to restore ${app.displayName}: ${err.message}`);
    }
  }

  // Summary
  await logger.info("=== Full restore complete ===");
  if (failed.length > 0) {
    await logger.warn(`Some apps failed to restore: ${failed.join(", ")}`);
    process.exit(1);
  } else {
    await logger.info("All apps restored successfully");
  }
}

// ─── Interactive (TTY) restore ──────────────────────────────────────────────

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

function SingleRestoreInteractive({
  app,
  dateArg,
  autoYes,
}: {
  app: AppDefinition;
  dateArg?: string;
  autoYes: boolean;
}) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"init" | "confirm" | "running" | "done">(
    "init",
  );
  const [currentLabel, setCurrentLabel] = useState(
    `Finding backup for ${app.displayName}...`,
  );
  const [error, setError] = useState<string | null>(null);
  const [backupFile, setBackupFile] = useState<FoundBackup | null>(null);

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    findBackup();
  }, []);

  async function findBackup() {
    try {
      const config = getBackupConfig(await loadEnvConfig());
      const found = await findBackupFile(app.name, dateArg, config);
      if (!found) {
        setError(`No backup found for ${app.displayName}`);
        return;
      }
      setBackupFile(found);
      addStep({
        name: "Backup found",
        status: "done",
        message: found.path,
      });

      if (autoYes) {
        await doRestore(found);
      } else {
        setPhase("confirm");
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function doRestore(found: FoundBackup) {
    setPhase("running");
    try {
      const env = await loadEnvConfig();
      const config = getBackupConfig(env);
      const logger = createRestoreLogger();
      const password = config.BACKUP_PASSWORD;

      // Stop container
      setCurrentLabel(`Stopping ${app.displayName} container...`);
      const containerName = getContainerName(app);
      await stopContainer(containerName);
      addStep({ name: `Stop ${app.displayName}`, status: "done" });

      // Remove config dirs
      setCurrentLabel(`Removing config directories...`);
      const configPaths = getConfigPaths(app, config.BASE_DIR);
      for (const p of configPaths) {
        await shell("rm", ["-rf", p], { sudo: true });
      }
      addStep({ name: "Remove config", status: "done" });

      // Decrypt if encrypted
      let extractPath = found.path;
      if (isEncryptedBackup(found.path)) {
        if (!password) {
          setError("Backup is encrypted. Set BACKUP_PASSWORD in .env");
          return;
        }
        setCurrentLabel(`Decrypting backup...`);
        extractPath = await decryptFile(found.path, password);
        addStep({ name: "Decrypt", status: "done" });
      }

      // Extract backup
      setCurrentLabel(`Extracting backup...`);
      await extractBackup(extractPath, config.BASE_DIR);
      addStep({ name: "Extract backup", status: "done" });

      // Clean up decrypted temp file
      if (extractPath !== found.path) {
        await shell("rm", ["-f", extractPath], { ignoreError: true });
      }

      // Clean up temp dir
      if (found.tempDir) {
        await shell("rm", ["-rf", found.tempDir]);
      }

      // Start container
      const composePath = getComposePath(app, config.BASE_DIR);
      if (existsSync(composePath)) {
        setCurrentLabel(`Starting ${app.displayName} container...`);
        await composeUp(composePath);
        addStep({ name: `Start ${app.displayName}`, status: "done" });
      }

      await logger.info(`Restored ${app.displayName} from ${found.path}`);
      setPhase("done");
      setTimeout(() => exit(), 500);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleConfirm() {
    if (backupFile) doRestore(backupFile);
  }

  function handleCancel() {
    exit();
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Restore" />
        {completedSteps.map((step, i) => (
          <AppStatus
            key={i}
            name={step.name}
            status={step.status}
            message={step.message}
          />
        ))}
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Restore" />

      {/* Persistent completed steps */}
      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {/* Confirmation prompt */}
      {phase === "confirm" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>This will:</Text>
          <Text>  1. Stop the {app.displayName} container</Text>
          <Text>  2. Delete the current config directory</Text>
          <Text>
            {"  3. Restore from: "}
            <Text bold>{backupFile?.path}</Text>
          </Text>
          <Text>  4. Start the container</Text>
          <Text />
          <Text dimColor>
            Note: Media files in the data directory are not included in backups
            (too large). Only app configs and databases are restored.
          </Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
          </Box>
        </Box>
      )}

      {/* Current active phase with spinner */}
      {(phase === "init" || phase === "running") && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}
          {currentLabel}
        </Text>
      )}

      {/* Final summary */}
      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            {app.displayName} restored successfully
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

function FullRestoreInteractive({
  dateArg,
  autoYes,
}: {
  dateArg?: string;
  autoYes: boolean;
}) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"init" | "confirm" | "running" | "done">(
    "init",
  );
  const [currentLabel, setCurrentLabel] = useState(
    "Finding available backups...",
  );
  const [failedCount, setFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [restoreProgress, setRestoreProgress] = useState({ current: 0, total: 0 });

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    discoverBackups();
  }, []);

  async function discoverBackups() {
    try {
      const env = await loadEnvConfig();
      const config = getBackupConfig(env);
      const { apps } = await findAvailableBackups(dateArg, config, env);

      if (apps.length === 0) {
        setError("No backups found");
        return;
      }

      setAvailableApps(apps);
      const appNames = apps.filter((a) => a !== "secrets");
      addStep({
        name: "Discovery",
        status: "done",
        message: `Found ${apps.length} backup(s): ${appNames.join(", ")}${apps.includes("secrets") ? " + secrets" : ""}`,
      });

      if (autoYes) {
        await doFullRestore(apps);
      } else {
        setPhase("confirm");
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function doFullRestore(apps: string[]) {
    setPhase("running");
    const env = await loadEnvConfig();
    const config = getBackupConfig(env);
    const logger = createRestoreLogger();
    const password = config.BACKUP_PASSWORD;
    let failed = 0;

    // Restore secrets first
    if (apps.includes("secrets")) {
      setCurrentLabel("Restoring secrets...");
      try {
        const secretsBackup = await findBackupFile("secrets", dateArg, config);
        if (secretsBackup) {
          let extractPath = secretsBackup.path;
          if (isEncryptedBackup(extractPath)) {
            if (!password) {
              addStep({ name: "Secrets", status: "error", message: "Encrypted — set BACKUP_PASSWORD" });
            } else {
              setCurrentLabel("Decrypting secrets...");
              extractPath = await decryptFile(extractPath, password);
            }
          }
          if (!isEncryptedBackup(extractPath)) {
            const projectRoot = getProjectRoot();
            await extractBackup(extractPath, projectRoot);
            if (extractPath !== secretsBackup.path) {
              await shell("rm", ["-f", extractPath], { ignoreError: true });
            }
            if (secretsBackup.tempDir) {
              await shell("rm", ["-rf", secretsBackup.tempDir]);
            }
            addStep({ name: "Secrets", status: "done" });
            await logger.info("Restored secrets");
          }
        }
      } catch (err: any) {
        addStep({
          name: "Secrets",
          status: "error",
          message: err.message,
        });
      }
    }

    // Restore each app
    const appNames = apps.filter((a) => a !== "secrets");
    setRestoreProgress({ current: 0, total: appNames.length });
    for (let i = 0; i < appNames.length; i++) {
      const appName = appNames[i];
      const app = getApp(appName);
      if (!app) continue;

      setRestoreProgress({ current: i, total: appNames.length });
      setCurrentLabel(`Restoring ${app.displayName}...`);
      try {
        const found = await findBackupFile(appName, dateArg, config);
        if (!found) {
          addStep({
            name: app.displayName,
            status: "error",
            message: "Backup not found",
          });
          failed++;
          continue;
        }
        if (isEncryptedBackup(found.path) && !password) {
          addStep({
            name: app.displayName,
            status: "error",
            message: "Encrypted — set BACKUP_PASSWORD",
          });
          failed++;
          continue;
        }
        await restoreApp(app, found.path, found.tempDir, config, logger, password);
        addStep({ name: app.displayName, status: "done" });
      } catch (err: any) {
        addStep({
          name: app.displayName,
          status: "error",
          message: err.message,
        });
        failed++;
        await logger.warn(
          `Failed to restore ${app.displayName}: ${err.message}`,
        );
      }
    }

    setFailedCount(failed);
    setPhase("done");
    setTimeout(() => {
      process.exitCode = failed > 0 ? 1 : 0;
      exit();
    }, 500);
  }

  function handleConfirm() {
    doFullRestore(availableApps);
  }

  function handleCancel() {
    exit();
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Full Restore" />
        {completedSteps.map((step, i) => (
          <AppStatus
            key={i}
            name={step.name}
            status={step.status}
            message={step.message}
          />
        ))}
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Full Restore" />

      {/* Persistent completed steps */}
      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {/* Confirmation prompt */}
      {phase === "confirm" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>This will restore all apps from {dateArg ?? "latest"} backup:</Text>
          <Text>
            {"  "}
            {availableApps.filter((a) => a !== "secrets").join(", ")}
          </Text>
          <Text />
          <Text>Each app will be stopped, config deleted, and restored.</Text>
          <Text />
          <Text dimColor>
            Note: Media files in the data directory are not included in backups
            (too large). Only app configs and databases are restored.
          </Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
          </Box>
        </Box>
      )}

      {/* Current active phase with spinner */}
      {(phase === "init" || phase === "running") && (
        <Box flexDirection="column">
          <Text>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {" "}
            {currentLabel}
          </Text>
          {phase === "running" && restoreProgress.total > 1 && (
            <ProgressBar
              percent={(restoreProgress.current / restoreProgress.total) * 100}
              label={`${restoreProgress.current}/${restoreProgress.total} apps`}
            />
          )}
        </Box>
      )}

      {/* Final summary */}
      {phase === "done" && (
        <Box marginTop={1}>
          {failedCount > 0 ? (
            <StatusMessage variant="warning">
              Restore completed with {failedCount} failure(s)
            </StatusMessage>
          ) : (
            <StatusMessage variant="success">
              Full restore completed successfully
            </StatusMessage>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runRestore(
  args: string[],
  flags: { yes?: boolean },
): Promise<void> {
  const [target] = args;
  const dateArg = args[1];
  const autoYes = flags.yes ?? false;

  // Validate target
  if (!target) {
    console.log(`Usage: mithrandir restore <app|full> [date] [--yes]\n`);
    console.log(`Apps: ${getAppNames().join(", ")}`);
    console.log(`Date: YYYY-MM-DD or "latest" (default: latest)`);
    process.exit(1);
  }

  // Validate date format
  if (dateArg && !isValidDate(dateArg)) {
    console.error(`Invalid date format: ${dateArg}. Use YYYY-MM-DD or 'latest'`);
    process.exit(1);
  }

  if (target === "full") {
    if (process.stdout.isTTY) {
      const { waitUntilExit } = render(
        <FullRestoreInteractive dateArg={dateArg} autoYes={autoYes} />,
      );
      await waitUntilExit();
    } else {
      await runHeadlessFullRestore(dateArg, autoYes);
    }
    return;
  }

  // Single app restore
  const app = getApp(target);
  if (!app) {
    console.error(`Unknown app: ${target}`);
    console.error(`Valid apps: ${getAppNames().join(", ")}`);
    process.exit(1);
  }

  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(
      <SingleRestoreInteractive
        app={app}
        dateArg={dateArg}
        autoYes={autoYes}
      />,
    );
    await waitUntilExit();
  } else {
    await runHeadlessSingleRestore(app, dateArg, autoYes);
  }
}
