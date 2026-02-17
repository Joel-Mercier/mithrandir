import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage, ConfirmInput } from "@inkjs/ui";
import { loadBackupConfig } from "../lib/config.js";
import {
  APP_REGISTRY,
  getApp,
  getConfigPaths,
  getComposePath,
  getContainerName,
} from "../lib/apps.js";
import { createBackup } from "../lib/tar.js";
import {
  getRunningImageId,
  pullImage,
  pullImageWithProgress,
  composeDown,
  composeUp,
} from "../lib/docker.js";
import { shell } from "../lib/shell.js";
import {
  upload,
  isRcloneInstalled,
  isRcloneRemoteConfigured,
} from "../lib/rclone.js";
import { Header } from "../components/Header.js";
import { AppStatus } from "../components/AppStatus.js";
import { ProgressBar } from "../components/ProgressBar.js";
import type { BackupConfig } from "../types.js";
import type { AppDefinition } from "../types.js";
import { existsSync } from "fs";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Detect installed apps by checking for docker-compose.yml and config dirs */
async function detectInstalledApps(
  config: BackupConfig,
): Promise<AppDefinition[]> {
  const installed: AppDefinition[] = [];
  for (const app of APP_REGISTRY) {
    const composePath = getComposePath(app, config.BASE_DIR);
    const configPaths = getConfigPaths(app, config.BASE_DIR);

    if (!existsSync(composePath)) continue;

    const hasConfig = configPaths.some((p) => existsSync(p));
    if (hasConfig) {
      installed.push(app);
    }
  }

  return installed;
}

// ─── Interactive update component ───────────────────────────────────────────

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

type Phase = "init" | "confirm-backup" | "backing-up" | "updating" | "done";

function UpdateInteractive({
  appFilter,
  skipConfirm,
}: {
  appFilter?: string;
  skipConfirm: boolean;
}) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<Phase>("init");
  const [currentLabel, setCurrentLabel] = useState("Loading configuration...");
  const [updatedCount, setUpdatedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Resolved state shared between phases
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [apps, setApps] = useState<AppDefinition[]>([]);
  const [doBackup, setDoBackup] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  // Phase: init — load config and detect apps
  useEffect(() => {
    if (phase !== "init") return;
    (async () => {
      try {
        const cfg = await loadBackupConfig();
        setConfig(cfg);

        let detected: AppDefinition[];
        if (appFilter) {
          const app = getApp(appFilter);
          if (!app) {
            setError(`Unknown app: ${appFilter}`);
            return;
          }
          // Verify it's installed
          const composePath = getComposePath(app, cfg.BASE_DIR);
          if (!existsSync(composePath)) {
            setError(`${app.displayName} is not installed`);
            return;
          }
          detected = [app];
        } else {
          detected = await detectInstalledApps(cfg);
          if (detected.length === 0) {
            addStep({
              name: "Detection",
              status: "skipped",
              message: "No apps found",
            });
            setPhase("done");
            return;
          }
          addStep({
            name: "Detection",
            status: "done",
            message: `Found ${detected.length} app(s): ${detected.map((a) => a.name).join(", ")}`,
          });
        }

        setApps(detected);

        if (skipConfirm) {
          setPhase("updating");
        } else {
          setPhase("confirm-backup");
        }
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [phase]);

  // Phase: backing-up
  useEffect(() => {
    if (phase !== "backing-up" || !config) return;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const archiveDir = `${config.BACKUP_DIR}/archive/${today}`;
        const latestDir = `${config.BACKUP_DIR}/latest`;

        // Ensure backup directory structure exists (matches backup command)
        await shell(
          "mkdir",
          ["-p", archiveDir, latestDir],
          { sudo: true },
        );
        const { stdout: user } = await shell("id", ["-un"]);
        const { stdout: group } = await shell("id", ["-gn"]);
        await shell(
          "chown",
          ["-R", `${user.trim()}:${group.trim()}`, config.BACKUP_DIR],
          { sudo: true },
        );

        for (const app of apps) {
          setCurrentLabel(`Backing up ${app.displayName}...`);
          try {
            const outputPath = `${archiveDir}/${app.name}.tar.zst`;
            await createBackup(app, config.BASE_DIR, outputPath);
            // Update latest symlink
            await shell("ln", ["-sf", outputPath, `${latestDir}/${app.name}.tar.zst`]);
            addStep({ name: `Backup ${app.displayName}`, status: "done" });
          } catch (err: any) {
            addStep({
              name: `Backup ${app.displayName}`,
              status: "error",
              message: err.message,
            });
          }
        }

        // Upload to remote if rclone is configured
        if (await isRcloneInstalled()) {
          const remoteCheck = await isRcloneRemoteConfigured(config.RCLONE_REMOTE);
          if (remoteCheck.configured) {
            setCurrentLabel(`Uploading backup to ${config.RCLONE_REMOTE}...`);
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
          }
        }

        setPhase("updating");
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [phase]);

  // Phase: updating
  useEffect(() => {
    if (phase !== "updating" || !config) return;
    (async () => {
      try {
        let updated = 0;
        let failed = 0;

        for (const app of apps) {
          const containerName = getContainerName(app);
          const composePath = getComposePath(app, config.BASE_DIR);

          setCurrentLabel(`Pulling ${app.displayName}...`);
          setPullProgress(0);
          try {
            // Get current image ID (empty string if container not running)
            const oldImageId = await getRunningImageId(containerName);

            // Pull the new image with progress
            const newImageId = await pullImageWithProgress(
              app.image,
              (pct) => setPullProgress(pct),
            );

            if (oldImageId && oldImageId === newImageId) {
              addStep({
                name: app.displayName,
                status: "skipped",
                message: "Already up to date",
              });
              continue;
            }

            // Recreate with new image
            setCurrentLabel(`Recreating ${app.displayName}...`);
            await composeDown(composePath);
            await composeUp(composePath);

            addStep({
              name: app.displayName,
              status: "done",
              message: "Updated",
            });
            updated++;
          } catch (err: any) {
            addStep({
              name: app.displayName,
              status: "error",
              message: err.message,
            });
            failed++;
          }
        }

        setUpdatedCount(updated);
        setFailedCount(failed);
        setPhase("done");
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [phase]);

  // Phase: done — exit
  useEffect(() => {
    if (phase !== "done") return;
    setTimeout(() => {
      process.exitCode = failedCount > 0 ? 1 : 0;
      exit();
    }, 500);
  }, [phase]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Update" />
        <StatusMessage variant="error">Update failed: {error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Update" />

      {/* Completed steps */}
      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {/* Backup confirmation prompt */}
      {phase === "confirm-backup" && (
        <Box flexDirection="column">
          <Text>Back up apps before updating?</Text>
          <ConfirmInput
            onConfirm={() => {
              setDoBackup(true);
              setPhase("backing-up");
            }}
            onCancel={() => {
              setPhase("updating");
            }}
          />
        </Box>
      )}

      {/* Spinner for active phases */}
      {phase === "backing-up" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{currentLabel}
        </Text>
      )}
      {phase === "updating" && (
        <Box flexDirection="column">
          <Text>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {" "}{currentLabel}
          </Text>
          {currentLabel.startsWith("Pulling") && pullProgress > 0 && pullProgress < 100 && (
            <ProgressBar percent={pullProgress} label={currentLabel.replace("Pulling ", "").replace("...", "")} />
          )}
        </Box>
      )}

      {/* Summary */}
      {phase === "done" && (
        <Box marginTop={1}>
          {failedCount > 0 ? (
            <StatusMessage variant="warning">
              Update completed with {failedCount} failure(s)
            </StatusMessage>
          ) : updatedCount > 0 ? (
            <StatusMessage variant="success">
              {updatedCount} app(s) updated successfully
            </StatusMessage>
          ) : (
            <StatusMessage variant="success">
              All apps are already up to date
            </StatusMessage>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function runUpdate(
  args: string[],
  flags: { yes?: boolean },
): Promise<void> {
  if (process.getuid?.() !== 0) {
    console.error("Error: This command must be run as root (use sudo).");
    process.exit(1);
  }

  const appFilter = args[0];

  if (appFilter) {
    const app = getApp(appFilter);
    if (!app) {
      console.error(
        `Unknown app: ${appFilter}\nRun 'mithrandir update' to update all installed apps.`,
      );
      process.exit(1);
    }
  }

  const { waitUntilExit } = render(
    <UpdateInteractive appFilter={appFilter} skipConfirm={!!flags.yes} />,
  );
  await waitUntilExit();
}
