import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { ConfirmInput, StatusMessage } from "@inkjs/ui";
import { existsSync } from "fs";
import { getApp, getAppNames, getAppDir, getCompanionApps } from "@/lib/apps.js";
import { shell } from "@/lib/shell.js";
import { loadEnvConfig, getProjectRoot } from "@/lib/config.js";
import { regenerateCaddyfile } from "@/lib/caddy.js";
import { regenerateGatusConfig } from "@/lib/gatus.js";
import { isUfwActive, removeAppPorts } from "@/lib/ufw.js";
import {
  stopAllApps,
  removeAllSystemdUnits,
  deleteBackups,
  removeRclone,
  getAppDataDirs,
  resolveBaseDir,
  removeAppDataDirs,
  stopDocker,
  removeDocker,
  removeLogs,
  removeCliArtifacts,
  removeEnvFile,
} from "@/lib/remove.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";

// ---------------------------------------------------------------------------
// PATH safety — ensure standard paths exist when running under sudo/systemd
// ---------------------------------------------------------------------------
function ensurePath() {
  const required = [
    "/usr/local/sbin",
    "/usr/local/bin",
    "/usr/sbin",
    "/usr/bin",
    "/sbin",
    "/bin",
  ];
  const current = (process.env.PATH ?? "").split(":");
  for (const p of required) {
    if (!current.includes(p)) current.push(p);
  }
  process.env.PATH = current.join(":");
}

// ===========================================================================
// Per-app uninstall (interactive Ink component)
// ===========================================================================

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

function AppUninstallInteractive({
  appName,
  autoYes,
}: {
  appName: string;
  autoYes: boolean;
}) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<
    "init" | "stopping" | "confirm-delete" | "deleting" | "done"
  >("init");
  const [currentLabel, setCurrentLabel] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [appDir, setAppDir] = useState("");

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    run();
  }, []);

  async function run() {
    const app = getApp(appName);
    if (!app) {
      setError(`Unknown app: ${appName}\nValid apps: ${getAppNames().join(", ")}`);
      return;
    }

    const env = await loadEnvConfig();
    const dir = getAppDir(app, env.BASE_DIR);
    setAppDir(dir);

    if (!existsSync(dir)) {
      setError(`App directory not found: ${dir}\nIs '${appName}' installed?`);
      return;
    }

    // Stop and remove container
    const composePath = `${dir}/docker-compose.yml`;
    if (existsSync(composePath)) {
      setPhase("stopping");
      setCurrentLabel(`Stopping ${appName} container...`);
      await shell("docker", ["compose", "down", "--volumes"], { sudo: true, cwd: dir, ignoreError: true });
      // Prune unused networks to reclaim Docker subnet address pool
      await shell("docker", ["network", "prune", "-f"], { sudo: true, ignoreError: true });
      addStep({ name: "Stop container", status: "done", message: "Container stopped and removed" });
    } else {
      addStep({ name: "Stop container", status: "skipped", message: "No docker-compose.yml found" });
    }

    // Uninstall companion apps
    const companions = getCompanionApps(appName);
    for (const companion of companions) {
      const companionDir = getAppDir(companion, env.BASE_DIR);
      const companionComposePath = `${companionDir}/docker-compose.yml`;
      if (existsSync(companionComposePath)) {
        setCurrentLabel(`Stopping ${companion.name}...`);
        await shell("docker", ["compose", "down", "--volumes"], { sudo: true, cwd: companionDir, ignoreError: true });
        await shell("rm", ["-rf", companionDir], { sudo: true });
        addStep({ name: companion.displayName, status: "done", message: "Uninstalled" });
      }
    }

    // Remove UFW rules if firewall is enabled
    if (env.ENABLE_FIREWALL === "true" && await isUfwActive()) {
      try {
        await removeAppPorts(app);
        for (const companion of companions) {
          await removeAppPorts(companion);
        }
        addStep({ name: "Firewall", status: "done", message: "UFW rules removed" });
      } catch {
        addStep({ name: "Firewall", status: "skipped", message: "Failed to remove UFW rules" });
      }
    }

    // Ask about removing data
    if (autoYes) {
      await deleteAppData(dir);
    } else {
      setPhase("confirm-delete");
    }
  }

  async function deleteAppData(dir: string) {
    setPhase("deleting");
    setCurrentLabel("Removing app data...");
    await shell("rm", ["-rf", dir], { sudo: true });
    addStep({ name: "Remove data", status: "done", message: `Removed ${dir}` });
    await updateCaddyfile();
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  async function updateCaddyfile() {
    const env = await loadEnvConfig();
    if (env.ENABLE_HTTPS === "true") {
      try {
        await regenerateCaddyfile(env);
        addStep({ name: "HTTPS", status: "done", message: "Caddyfile updated" });
      } catch {
        addStep({ name: "HTTPS", status: "skipped", message: "Failed to update Caddyfile" });
      }
    }

    // Regenerate Gatus config to remove uninstalled app (skip if uninstalling Gatus itself)
    if (appName !== "gatus") {
      try {
        await regenerateGatusConfig(env);
        addStep({ name: "Gatus", status: "done", message: "Health checks updated" });
      } catch {
        // Non-fatal: Gatus may not be installed
      }
    }
  }

  function handleConfirmDelete() {
    deleteAppData(appDir);
  }

  async function handleCancelDelete() {
    addStep({
      name: "Remove data",
      status: "skipped",
      message: `Kept ${appDir}`,
    });
    await updateCaddyfile();
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title={`Uninstall: ${appName}`} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title={`Uninstall: ${appName}`} />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {(phase === "init" || phase === "stopping" || phase === "deleting") && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{currentLabel}
        </Text>
      )}

      {phase === "confirm-delete" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>App directory: <Text bold>{appDir}</Text></Text>
          <Text>Remove app directory and all its data? (This is irreversible)</Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />
          </Box>
        </Box>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Uninstall of '{appName}' complete
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

// ===========================================================================
// Full system remove (interactive Ink component — per-step prompts)
// ===========================================================================

type RemovePhase =
  | "confirm-start"
  | "running"
  | "confirm-backups"
  | "confirm-rclone"
  | "confirm-appdata"
  | "confirm-docker"
  | "confirm-env"
  | "done";

function SystemRemoveInteractive({ autoYes }: { autoYes: boolean }) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<RemovePhase>("confirm-start");
  const [currentLabel, setCurrentLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [appDataDirsList, setAppDataDirsList] = useState<string[]>([]);
  const [baseDir, setBaseDir] = useState("");
  const [backupDir, setBackupDir] = useState("/backups");

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    if (autoYes) {
      runRemove({ skipBackups: false, skipRclone: false, skipAppData: false, skipDocker: false, skipEnv: false });
    }
  }, []);

  async function runRemove(options: {
    skipBackups: boolean;
    skipRclone: boolean;
    skipAppData: boolean;
    skipDocker: boolean;
    skipEnv: boolean;
  }) {
    try {
      setPhase("running");

      // Load config
      const env = await loadEnvConfig();
      const resolvedBaseDir = env.BASE_DIR || await resolveBaseDir();
      const resolvedBackupDir = env.BACKUP_DIR || "/backups";
      setBaseDir(resolvedBaseDir);
      setBackupDir(resolvedBackupDir);

      // Step 1: Stop all apps
      setCurrentLabel("Stopping all apps...");
      const stopped = await stopAllApps(resolvedBaseDir);
      if (stopped.length > 0) {
        addStep({ name: "Stop apps", status: "done", message: `Stopped ${stopped.length} app(s)` });
      } else {
        addStep({ name: "Stop apps", status: "skipped", message: "No running apps found" });
      }

      // Step 2: Remove systemd services (always — no prompt)
      setCurrentLabel("Removing systemd services...");
      await removeAllSystemdUnits();
      addStep({ name: "Systemd services", status: "done", message: "Removed backup, UI, and tusd services" });

      // Step 3: Delete local backups (prompt or auto)
      if (!options.skipBackups) {
        if (!autoYes) {
          setPhase("confirm-backups");
          return; // Wait for user input — will resume via continueAfterBackups
        }
        await doDeleteBackups(resolvedBackupDir);
      } else {
        addStep({ name: "Local backups", status: "skipped", message: "Kept" });
      }

      await continueFromRclone(options, resolvedBaseDir, resolvedBackupDir);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function doDeleteBackups(dir: string) {
    setPhase("running");
    setCurrentLabel("Deleting local backups...");
    const deleted = await deleteBackups(dir);
    addStep({
      name: "Local backups",
      status: deleted ? "done" : "skipped",
      message: deleted ? `Removed ${dir}` : `${dir} does not exist`,
    });
  }

  async function continueFromRclone(
    options: { skipRclone: boolean; skipAppData: boolean; skipDocker: boolean; skipEnv: boolean },
    resolvedBaseDir: string,
    _resolvedBackupDir: string,
  ) {
    // Step 4: Uninstall rclone
    if (!options.skipRclone) {
      if (!autoYes) {
        setPhase("confirm-rclone");
        return;
      }
      await doRemoveRclone();
    } else {
      addStep({ name: "rclone", status: "skipped", message: "Kept" });
    }

    await continueFromAppData(options, resolvedBaseDir);
  }

  async function doRemoveRclone() {
    setPhase("running");
    setCurrentLabel("Uninstalling rclone...");
    const removed = await removeRclone();
    addStep({
      name: "rclone",
      status: removed ? "done" : "skipped",
      message: removed ? "Removed" : "Not installed",
    });
  }

  async function continueFromAppData(
    options: { skipAppData: boolean; skipDocker: boolean; skipEnv: boolean },
    resolvedBaseDir: string,
  ) {
    // Step 5: Remove app data
    const dirs = getAppDataDirs(resolvedBaseDir);
    setAppDataDirsList(dirs);

    if (!options.skipAppData && dirs.length > 0) {
      if (!autoYes) {
        setPhase("confirm-appdata");
        return;
      }
      await doRemoveAppData(resolvedBaseDir, dirs);
    } else {
      addStep({
        name: "App data",
        status: "skipped",
        message: dirs.length === 0 ? "No app data directories found" : "Kept",
      });
    }

    await continueFromDocker(options);
  }

  async function doRemoveAppData(dir: string, dirs: string[]) {
    setPhase("running");
    setCurrentLabel("Removing app data directories...");
    await removeAppDataDirs(dir, dirs);
    addStep({ name: "App data", status: "done", message: `Removed ${dirs.length} directory(ies) from ${dir}` });
  }

  async function continueFromDocker(options: { skipDocker: boolean; skipEnv: boolean }) {
    // Step 6: Remove Docker
    if (!options.skipDocker) {
      if (!autoYes) {
        setPhase("confirm-docker");
        return;
      }
      await doRemoveDocker();
    } else {
      addStep({ name: "Docker", status: "skipped", message: "Kept" });
    }

    await finishRemoval(options);
  }

  async function doRemoveDocker() {
    setPhase("running");
    setCurrentLabel("Stopping Docker services...");
    await stopDocker();
    setCurrentLabel("Removing Docker containers, images, and packages...");
    await removeDocker();
    addStep({ name: "Docker", status: "done", message: "Purged" });
  }

  async function finishRemoval(options: { skipEnv: boolean }) {
    // Step 7: Remove logs (always — no prompt)
    setPhase("running");
    setCurrentLabel("Cleaning up log files...");
    await removeLogs();
    addStep({ name: "Log files", status: "done", message: "Removed" });

    // Step 8: Remove CLI artifacts (always — no prompt)
    setCurrentLabel("Removing CLI...");
    await removeCliArtifacts();
    addStep({ name: "CLI & cache", status: "done", message: "Removed /usr/local/bin/mithrandir" });

    // Step 9: Remove .env
    if (!options.skipEnv) {
      if (!autoYes) {
        setPhase("confirm-env");
        return;
      }
      await doRemoveEnv();
    } else {
      addStep({ name: "Configuration", status: "skipped", message: "Kept .env" });
    }

    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  async function doRemoveEnv() {
    setPhase("running");
    setCurrentLabel("Removing configuration...");
    const projectRoot = getProjectRoot();
    const removed = await removeEnvFile(projectRoot);
    addStep({
      name: "Configuration",
      status: removed ? "done" : "skipped",
      message: removed ? "Removed .env" : "No .env file found",
    });
  }

  // --- Prompt handlers for each skippable step ---

  function handleConfirmStart() {
    runRemove({ skipBackups: false, skipRclone: false, skipAppData: false, skipDocker: false, skipEnv: false });
  }

  function handleCancelStart() {
    setTimeout(() => exit(), 100);
  }

  async function handleConfirmBackups() {
    await doDeleteBackups(backupDir);
    await continueFromRclone(
      { skipRclone: false, skipAppData: false, skipDocker: false, skipEnv: false },
      baseDir,
      backupDir,
    );
  }

  async function handleSkipBackups() {
    addStep({ name: "Local backups", status: "skipped", message: "Kept" });
    await continueFromRclone(
      { skipRclone: false, skipAppData: false, skipDocker: false, skipEnv: false },
      baseDir,
      backupDir,
    );
  }

  async function handleConfirmRclone() {
    await doRemoveRclone();
    await continueFromAppData(
      { skipAppData: false, skipDocker: false, skipEnv: false },
      baseDir,
    );
  }

  async function handleSkipRclone() {
    addStep({ name: "rclone", status: "skipped", message: "Kept" });
    await continueFromAppData(
      { skipAppData: false, skipDocker: false, skipEnv: false },
      baseDir,
    );
  }

  async function handleConfirmAppData() {
    await doRemoveAppData(baseDir, appDataDirsList);
    await continueFromDocker({ skipDocker: false, skipEnv: false });
  }

  async function handleSkipAppData() {
    addStep({ name: "App data", status: "skipped", message: "Kept" });
    await continueFromDocker({ skipDocker: false, skipEnv: false });
  }

  async function handleConfirmDocker() {
    await doRemoveDocker();
    await finishRemoval({ skipEnv: false });
  }

  async function handleSkipDocker() {
    addStep({ name: "Docker", status: "skipped", message: "Kept" });
    await finishRemoval({ skipEnv: false });
  }

  async function handleConfirmEnv() {
    await doRemoveEnv();
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  async function handleSkipEnv() {
    addStep({ name: "Configuration", status: "skipped", message: "Kept .env" });
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Remove Mithrandir" />
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
      <Header title="Remove Mithrandir" />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {phase === "confirm-start" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="yellow" bold>
              This will guide you through removing Mithrandir from this machine.
            </Text>
          </Box>
          <Text>  You will be prompted at each step to choose what to remove.</Text>
          <Text>  Docker and app data can be kept if you want.</Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirmStart} onCancel={handleCancelStart} />
          </Box>
        </Box>
      )}

      {phase === "running" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{currentLabel}
        </Text>
      )}

      {phase === "confirm-backups" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Delete all local backups in <Text bold>{backupDir}</Text>?</Text>
          <Box marginTop={1}>
            <Text>Remove? </Text>
            <ConfirmInput onConfirm={handleConfirmBackups} onCancel={handleSkipBackups} />
          </Box>
        </Box>
      )}

      {phase === "confirm-rclone" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Uninstall rclone and remove its configuration?</Text>
          <Box marginTop={1}>
            <Text>Remove? </Text>
            <ConfirmInput onConfirm={handleConfirmRclone} onCancel={handleSkipRclone} />
          </Box>
        </Box>
      )}

      {phase === "confirm-appdata" && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow" bold>The following directories in {baseDir} will be deleted:</Text>
          {appDataDirsList.map((d) => (
            <Text key={d}>  {d}</Text>
          ))}
          <Text dimColor>  Hidden files/directories and 'mithrandir' will be kept.</Text>
          <Box marginTop={1}>
            <Text>Remove? </Text>
            <ConfirmInput onConfirm={handleConfirmAppData} onCancel={handleSkipAppData} />
          </Box>
        </Box>
      )}

      {phase === "confirm-docker" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Uninstall Docker Engine and all containers/images/volumes?</Text>
          <Text dimColor>  Choosing 'no' will keep Docker and your apps running independently.</Text>
          <Box marginTop={1}>
            <Text>Remove? </Text>
            <ConfirmInput onConfirm={handleConfirmDocker} onCancel={handleSkipDocker} />
          </Box>
        </Box>
      )}

      {phase === "confirm-env" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Remove .env configuration file?</Text>
          <Text dimColor>  This contains your settings, secrets, and backup configuration.</Text>
          <Box marginTop={1}>
            <Text>Remove? </Text>
            <ConfirmInput onConfirm={handleConfirmEnv} onCancel={handleSkipEnv} />
          </Box>
        </Box>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Mithrandir has been removed from this machine
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export async function runUninstall(
  args: string[],
  flags: { yes?: boolean },
) {
  ensurePath();

  const autoYes = flags.yes ?? false;
  const appArg = args[0];

  if (appArg) {
    const { waitUntilExit } = render(
      <AppUninstallInteractive appName={appArg} autoYes={autoYes} />,
    );
    await waitUntilExit();
  } else {
    const { waitUntilExit } = render(
      <SystemRemoveInteractive autoYes={autoYes} />,
    );
    await waitUntilExit();
  }
}
