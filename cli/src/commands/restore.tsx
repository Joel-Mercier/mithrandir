import { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { ConfirmInput, Spinner as UiSpinner } from "@inkjs/ui";
import Spinner from "ink-spinner";
import { loadBackupConfig, getProjectRoot } from "../lib/config.js";
import {
  getApp,
  getAppNames,
  getConfigPaths,
  getComposePath,
  getContainerName,
} from "../lib/apps.js";
import { extractBackup } from "../lib/tar.js";
import { stopContainer } from "../lib/docker.js";
import { composeUp } from "../lib/docker.js";
import { download, listDirs, remoteFileExists, isRcloneInstalled } from "../lib/rclone.js";
import { shell } from "../lib/shell.js";
import { createRestoreLogger } from "../lib/logger.js";
import { Header } from "../components/Header.js";
import { AppStatus } from "../components/AppStatus.js";
import type { AppDefinition, BackupConfig } from "../types.js";
import { existsSync } from "fs";

interface RestoreCommandProps {
  args: string[];
  flags: { yes?: boolean };
}

export function RestoreCommand({ args, flags }: RestoreCommandProps) {
  const [target] = args;
  const dateArg = args[1];
  const autoYes = flags.yes ?? false;

  if (!target) {
    return <RestoreUsage />;
  }

  if (target === "full") {
    return (
      <FullRestore dateArg={dateArg} autoYes={autoYes} />
    );
  }

  const app = getApp(target);
  if (!app) {
    return (
      <Box flexDirection="column">
        <Text color="red">Unknown app: {target}</Text>
        <Text dimColor>Valid apps: {getAppNames().join(", ")}</Text>
      </Box>
    );
  }

  return (
    <SingleAppRestore app={app} dateArg={dateArg} autoYes={autoYes} />
  );
}

function RestoreUsage() {
  return (
    <Box flexDirection="column">
      <Text bold>Usage: homelab restore {"<app|full>"} [date] [--yes]</Text>
      <Text />
      <Text>Apps: {getAppNames().join(", ")}</Text>
      <Text>Date: YYYY-MM-DD or "latest" (default: latest)</Text>
    </Box>
  );
}

// ─── Single app restore ──────────────────────────────────────────────────────

interface SingleAppRestoreProps {
  app: AppDefinition;
  dateArg?: string;
  autoYes: boolean;
}

function SingleAppRestore({ app, dateArg, autoYes }: SingleAppRestoreProps) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<
    "finding" | "confirm" | "restoring" | "done" | "error"
  >("finding");
  const [backupFile, setBackupFile] = useState("");
  const [error, setError] = useState("");
  const [tempDir, setTempDir] = useState<string | null>(null);

  useEffect(() => {
    findBackup();
  }, []);

  async function findBackup() {
    try {
      const config = await loadBackupConfig();
      const file = await findBackupFile(app.name, dateArg, config);
      if (!file) {
        setError(`No backup found for ${app.displayName}`);
        setPhase("error");
        return;
      }
      setBackupFile(file.path);
      setTempDir(file.tempDir);
      if (autoYes) {
        await doRestore(file.path, file.tempDir);
      } else {
        setPhase("confirm");
      }
    } catch (err: any) {
      setError(err.message);
      setPhase("error");
    }
  }

  async function doRestore(filePath: string, tmpDir: string | null) {
    setPhase("restoring");
    try {
      const config = await loadBackupConfig();
      const logger = createRestoreLogger();
      await logger.info(`Restoring ${app.displayName} from ${filePath}`);

      // Stop container
      const containerName = getContainerName(app);
      await stopContainer(containerName);

      // Remove config dirs
      const configPaths = getConfigPaths(app, config.BASE_DIR);
      for (const p of configPaths) {
        await shell("rm", ["-rf", p], { sudo: true });
      }

      // Extract backup
      await extractBackup(filePath, config.BASE_DIR);

      // Clean up temp dir
      if (tmpDir) {
        await shell("rm", ["-rf", tmpDir]);
      }

      // Start container
      const composePath = getComposePath(app, config.BASE_DIR);
      if (existsSync(composePath)) {
        await composeUp(composePath);
      }

      await logger.info(`${app.displayName} restored successfully`);
      setPhase("done");
      setTimeout(() => exit(), 100);
    } catch (err: any) {
      setError(err.message);
      setPhase("error");
    }
  }

  function handleConfirm() {
    doRestore(backupFile, tempDir);
  }

  function handleCancel() {
    exit();
  }

  return (
    <Box flexDirection="column">
      <Header title="Restore" />

      {phase === "finding" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Finding backup for {app.displayName}...
        </Text>
      )}

      {phase === "confirm" && (
        <Box flexDirection="column">
          <Text>This will:</Text>
          <Text>  1. Stop the {app.displayName} container</Text>
          <Text>  2. Delete the current config directory</Text>
          <Text>  3. Restore from: <Text bold>{backupFile}</Text></Text>
          <Text>  4. Start the container</Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
          </Box>
        </Box>
      )}

      {phase === "restoring" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Restoring {app.displayName}...
        </Text>
      )}

      {phase === "done" && (
        <AppStatus name={app.displayName} status="done" message="Restored successfully" />
      )}

      {phase === "error" && (
        <Text color="red">Error: {error}</Text>
      )}
    </Box>
  );
}

// ─── Full system restore ─────────────────────────────────────────────────────

interface FullRestoreProps {
  dateArg?: string;
  autoYes: boolean;
}

function FullRestore({ dateArg, autoYes }: FullRestoreProps) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<
    "finding" | "confirm" | "restoring" | "done" | "error"
  >("finding");
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [currentApp, setCurrentApp] = useState("");
  const [results, setResults] = useState<
    Array<{ name: string; success: boolean; error?: string }>
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    findAvailableBackups();
  }, []);

  async function findAvailableBackups() {
    try {
      const config = await loadBackupConfig();
      const date = dateArg ?? "latest";
      const archiveDir = await resolveArchiveDir(date, config);

      if (!archiveDir) {
        setError("No backups found");
        setPhase("error");
        return;
      }

      // List available app backups
      const result = await shell("ls", ["-1", archiveDir], {
        ignoreError: true,
      });
      const files = result.stdout
        .trim()
        .split("\n")
        .filter((f) => f.endsWith(".tar.zst"))
        .map((f) => f.replace(".tar.zst", ""));

      setAvailableApps(files);

      if (autoYes) {
        await doFullRestore(files, archiveDir);
      } else {
        setPhase("confirm");
      }
    } catch (err: any) {
      setError(err.message);
      setPhase("error");
    }
  }

  async function doFullRestore(apps: string[], archiveDir: string) {
    setPhase("restoring");
    const config = await loadBackupConfig();
    const logger = createRestoreLogger();
    const restoreResults: Array<{
      name: string;
      success: boolean;
      error?: string;
    }> = [];

    // Restore secrets first
    const secretsPath = `${archiveDir}/secrets.tar.zst`;
    if (existsSync(secretsPath)) {
      try {
        setCurrentApp("secrets");
        const projectRoot = getProjectRoot();
        await extractBackup(secretsPath, projectRoot);
        restoreResults.push({ name: "secrets", success: true });
      } catch (err: any) {
        restoreResults.push({
          name: "secrets",
          success: false,
          error: err.message,
        });
      }
    }

    // Restore each app
    for (const appName of apps) {
      if (appName === "secrets") continue;
      const app = getApp(appName);
      if (!app) continue;

      setCurrentApp(app.displayName);
      try {
        const backupPath = `${archiveDir}/${appName}.tar.zst`;
        const containerName = getContainerName(app);

        await stopContainer(containerName);

        const configPaths = getConfigPaths(app, config.BASE_DIR);
        for (const p of configPaths) {
          await shell("rm", ["-rf", p], { sudo: true });
        }

        await extractBackup(backupPath, config.BASE_DIR);

        const composePath = getComposePath(app, config.BASE_DIR);
        if (existsSync(composePath)) {
          await composeUp(composePath);
        }

        restoreResults.push({ name: app.displayName, success: true });
        await logger.info(`Restored ${app.displayName}`);
      } catch (err: any) {
        restoreResults.push({
          name: app.displayName,
          success: false,
          error: err.message,
        });
        await logger.warn(`Failed to restore ${app.displayName}: ${err.message}`);
      }
    }

    setResults(restoreResults);
    setPhase("done");
    const hasFailures = restoreResults.some((r) => !r.success);
    setTimeout(() => {
      if (hasFailures) process.exit(1);
      else exit();
    }, 100);
  }

  function handleConfirm() {
    resolveArchiveDir(dateArg ?? "latest", null).then(
      (archiveDir) => {
        if (archiveDir) doFullRestore(availableApps, archiveDir);
      },
    );
  }

  function handleCancel() {
    exit();
  }

  return (
    <Box flexDirection="column">
      <Header title="Full Restore" />

      {phase === "finding" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Finding available backups...
        </Text>
      )}

      {phase === "confirm" && (
        <Box flexDirection="column">
          <Text>This will restore all apps:</Text>
          <Text>  {availableApps.filter((a) => a !== "secrets").join(", ")}</Text>
          <Text />
          <Text>Each app will be stopped, config deleted, and restored.</Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
          </Box>
        </Box>
      )}

      {phase === "restoring" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Restoring {currentApp}...
        </Text>
      )}

      {phase === "done" && (
        <Box flexDirection="column">
          {results.map((r) => (
            <AppStatus
              key={r.name}
              name={r.name}
              status={r.success ? "done" : "error"}
              message={r.error}
            />
          ))}
          <Box marginTop={1}>
            <Text bold>
              {results.every((r) => r.success)
                ? "Full restore completed successfully"
                : "Restore completed with errors"}
            </Text>
          </Box>
        </Box>
      )}

      {phase === "error" && (
        <Text color="red">Error: {error}</Text>
      )}
    </Box>
  );
}

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
    const latestPath = `${config.BACKUP_DIR}/latest/${appName}.tar.zst`;
    if (existsSync(latestPath)) {
      return { path: latestPath, tempDir: null };
    }
  }

  // Try local dated
  if (date !== "latest") {
    const datedPath = `${config.BACKUP_DIR}/archive/${date}/${appName}.tar.zst`;
    if (existsSync(datedPath)) {
      return { path: datedPath, tempDir: null };
    }
  }

  // Try local archive for latest
  if (date === "latest") {
    const archiveDir = await resolveArchiveDir("latest", config);
    if (archiveDir) {
      const path = `${archiveDir}/${appName}.tar.zst`;
      if (existsSync(path)) {
        return { path, tempDir: null };
      }
    }
  }

  // Try remote
  if (await isRcloneInstalled()) {
    try {
      let remoteDate = date;
      if (date === "latest") {
        const dirs = await listDirs(
          config.RCLONE_REMOTE,
          "/backups/archive",
        );
        if (dirs.length > 0) {
          remoteDate = dirs[dirs.length - 1];
        } else {
          return null;
        }
      }

      const remotePath = `/backups/archive/${remoteDate}/${appName}.tar.zst`;
      if (await remoteFileExists(config.RCLONE_REMOTE, remotePath)) {
        // Download to temp dir
        const { stdout: tmpDir } = await shell("mktemp", ["-d"]);
        const tempDir = tmpDir.trim();
        await download(
          config.RCLONE_REMOTE,
          remotePath,
          tempDir,
        );
        return {
          path: `${tempDir}/${appName}.tar.zst`,
          tempDir,
        };
      }
    } catch {
      // Remote failed, return null
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
    config = await loadBackupConfig();
  }

  if (date !== "latest") {
    const dir = `${config.BACKUP_DIR}/archive/${date}`;
    return existsSync(dir) ? dir : null;
  }

  // Find most recent local archive
  const result = await shell("ls", ["-1", `${config.BACKUP_DIR}/archive`], {
    ignoreError: true,
  });
  if (result.exitCode !== 0 || !result.stdout.trim()) return null;

  const dirs = result.stdout
    .trim()
    .split("\n")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  if (dirs.length === 0) return null;

  return `${config.BACKUP_DIR}/archive/${dirs[dirs.length - 1]}`;
}
