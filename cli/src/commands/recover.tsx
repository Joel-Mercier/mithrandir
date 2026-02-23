import { useState, useEffect, useRef } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { TextInput, ConfirmInput } from "@inkjs/ui";
import { StatusMessage } from "@inkjs/ui";
import {
  APP_REGISTRY,
  getApp,
  getAppDir,
  getConfigPaths,
} from "@/lib/apps.js";
import {
  isDockerInstalled,
  waitForDocker,
  installDocker,
} from "@/lib/docker.js";
import {
  isRcloneInstalled,
  installRclone,
  isRcloneRemoteConfigured,
  listDirs,
  listFiles,
  download,
} from "@/lib/rclone.js";
import { detectDistro } from "@/lib/distro.js";
import {
  hasSystemd,
  isWsl,
  installSystemdUnits,
} from "@/lib/systemd.js";
import {
  loadEnvConfig,
  loadBackupConfig,
  saveEnvConfig,
  getProjectRoot,
} from "@/lib/config.js";
import { extractBackup } from "@/lib/tar.js";
import { writeComposeAndStart } from "@/commands/setup.js";
import { shell } from "@/lib/shell.js";
import { createRestoreLogger, Logger } from "@/lib/logger.js";
import { Header } from "@/components/Header.js";
import { StepIndicator } from "@/components/StepIndicator.js";
import { AppStatus } from "@/components/AppStatus.js";
import { ProgressBar } from "@/components/ProgressBar.js";
import { ErrorBoundary } from "@/components/ErrorBoundary.js";
import type { EnvConfig, BackupConfig } from "@/types.js";
import { homedir } from "os";
import { existsSync } from "fs";

const TOTAL_STEPS = 9;

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Download a remote backup file to a temp dir, return local path */
async function downloadBackup(
  remote: string,
  remotePath: string,
): Promise<{ localPath: string; tempDir: string }> {
  const { stdout: tmpDir } = await shell("mktemp", ["-d"]);
  const tempDir = tmpDir.trim();
  await download(remote, remotePath, tempDir);
  const filename = remotePath.split("/").pop()!;
  return { localPath: `${tempDir}/${filename}`, tempDir };
}

/** Discover available app backups from the latest remote archive */
async function discoverRemoteBackups(
  rcloneRemote: string,
): Promise<{ date: string; apps: string[] } | null> {
  const dirs = await listDirs(rcloneRemote, "/backups/archive");
  if (dirs.length === 0) return null;

  const latestDate = dirs[dirs.length - 1];
  const files = await listFiles(rcloneRemote, `/backups/archive/${latestDate}`);

  const apps = files
    .filter((f) => f.endsWith(".tar.zst"))
    .map((f) => f.replace(".tar.zst", ""));

  return { date: latestDate, apps };
}

// ─── Headless (non-TTY) recover ─────────────────────────────────────────────

async function runHeadlessRecover(autoYes: boolean): Promise<void> {
  const logger = createRestoreLogger();
  await logger.info("=== Starting disaster recovery ===");

  // 1. Check root
  if (process.getuid?.() !== 0) {
    await logger.error("Recover must be run as root (sudo)");
    process.exit(1);
  }

  // 2. Detect distro
  try {
    const distro = await detectDistro();
    await logger.info(`Detected distro: ${distro.prettyName}`);
  } catch (err: any) {
    await logger.error(err.message);
    process.exit(1);
  }

  // 3. Install Docker
  if (await isDockerInstalled()) {
    await logger.info("Docker already installed");
  } else {
    await logger.info("Installing Docker...");
    await installDocker();
    await logger.info("Docker installed");
  }
  await logger.info("Waiting for Docker daemon...");
  const dockerReady = await waitForDocker();
  if (!dockerReady) {
    await logger.error("Docker daemon did not become ready in time");
    process.exit(1);
  }
  await logger.info("Docker daemon ready");

  // 4. Install rclone
  if (await isRcloneInstalled()) {
    await logger.info("rclone already installed");
  } else {
    await logger.info("Installing rclone...");
    await installRclone();
    await logger.info("rclone installed");
  }

  // 5. Check rclone remote
  const rcloneRemote = "gdrive";
  const remoteCheck = await isRcloneRemoteConfigured(rcloneRemote);
  if (!remoteCheck.configured) {
    await logger.error(
      `rclone remote '${rcloneRemote}' not configured. Run 'rclone config' first. (${remoteCheck.reason})`,
    );
    process.exit(1);
  }
  await logger.info(`rclone remote '${rcloneRemote}' configured`);

  // 6. Set BASE_DIR
  const baseDir = homedir();
  await logger.info(`Using BASE_DIR: ${baseDir}`);

  // Create data directory structure
  const dataDir = `${baseDir}/data`;
  const dirs = [
    `${dataDir}/downloads/movies`,
    `${dataDir}/downloads/tv`,
    `${dataDir}/downloads/music`,
    `${dataDir}/media/movies`,
    `${dataDir}/media/tv`,
    `${dataDir}/media/music`,
  ];
  for (const d of dirs) {
    await shell("mkdir", ["-p", d], { sudo: true });
  }

  // Write minimal .env
  const envConfig: EnvConfig = {
    BASE_DIR: baseDir,
    PUID: "1000",
    PGID: "1000",
    TZ: "Etc/UTC",
  };
  await saveEnvConfig(envConfig);

  // 7. Discover remote backups
  await logger.info("Discovering remote backups...");
  const discovered = await discoverRemoteBackups(rcloneRemote);
  if (!discovered || discovered.apps.length === 0) {
    await logger.error("No remote backups found");
    process.exit(1);
  }
  await logger.info(
    `Found backup from ${discovered.date}: ${discovered.apps.join(", ")}`,
  );

  if (!autoYes) {
    await logger.info(
      "Skipping recover — run with --yes to proceed non-interactively",
    );
    process.exit(0);
  }

  // 8. Restore secrets first
  const failed: string[] = [];
  if (discovered.apps.includes("secrets")) {
    try {
      await logger.info("Restoring secrets...");
      const remotePath = `/backups/archive/${discovered.date}/secrets.tar.zst`;
      const { localPath, tempDir } = await downloadBackup(
        rcloneRemote,
        remotePath,
      );
      const projectRoot = getProjectRoot();
      await extractBackup(localPath, projectRoot);
      await shell("rm", ["-rf", tempDir]);
      await logger.info("Secrets restored — reloading config");
    } catch (err: any) {
      await logger.warn(`Failed to restore secrets: ${err.message}`);
    }
  }

  // Reload config after secrets restore (may have .env/backup.conf)
  const reloadedEnv = await loadEnvConfig();
  const reloadedBackup = await loadBackupConfig();

  // 9. Restore each app
  const appNames = discovered.apps.filter((a) => a !== "secrets");
  for (const appName of appNames) {
    const app = getApp(appName);
    if (!app) {
      await logger.warn(`Unknown app '${appName}', skipping`);
      continue;
    }

    try {
      await logger.info(`Restoring ${app.displayName}...`);
      const remotePath = `/backups/archive/${discovered.date}/${appName}.tar.zst`;
      const { localPath, tempDir } = await downloadBackup(
        rcloneRemote,
        remotePath,
      );
      await extractBackup(localPath, reloadedEnv.BASE_DIR);
      await shell("rm", ["-rf", tempDir]);

      // Generate compose and start (fresh system has no compose files)
      await logger.info(`Starting ${app.displayName}...`);
      await writeComposeAndStart(app, reloadedEnv);
      await logger.info(`${app.displayName} restored and started`);
    } catch (err: any) {
      failed.push(appName);
      await logger.warn(
        `Failed to restore ${app.displayName}: ${err.message}`,
      );
    }
  }

  // 10. Systemd timer
  const systemdAvailable = await hasSystemd();
  const wsl = await isWsl();
  if (systemdAvailable && !wsl) {
    try {
      await installSystemdUnits();
      await logger.info("Backup timer installed (daily at 2:00 AM)");
    } catch {
      await logger.warn("Failed to install backup timer");
    }
  } else {
    await logger.info("Skipping backup timer (systemd not available or WSL)");
  }

  // Summary
  await logger.info("=== Recovery complete ===");
  if (failed.length > 0) {
    await logger.warn(`Some apps failed: ${failed.join(", ")}`);
    process.exit(1);
  } else {
    await logger.info(
      `All ${appNames.length} app(s) restored successfully from ${discovered.date}`,
    );
  }
}

// ─── Interactive (TTY) recover ──────────────────────────────────────────────

type RecoverStep =
  | "init"
  | "docker"
  | "rclone"
  | "rclone-remote"
  | "base-dir"
  | "discover"
  | "confirm"
  | "restoring"
  | "systemd"
  | "summary";

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

function RecoverCommand({ autoYes }: { autoYes: boolean }) {
  const { exit } = useApp();
  const [step, setStep] = useState<RecoverStep>("init");
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rcloneRemote, setRcloneRemote] = useState("gdrive");
  const [baseDir, setBaseDir] = useState(homedir());
  const [envConfig, setEnvConfig] = useState<EnvConfig>({
    BASE_DIR: homedir(),
    PUID: "1000",
    PGID: "1000",
    TZ: "Etc/UTC",
  });
  const [discovered, setDiscovered] = useState<{
    date: string;
    apps: string[];
  } | null>(null);
  const [restoreProgress, setRestoreProgress] = useState({
    current: 0,
    total: 0,
  });
  const [currentLabel, setCurrentLabel] = useState("Initializing...");
  const [failedApps, setFailedApps] = useState<string[]>([]);

  function addStep(s: CompletedStep) {
    setCompletedSteps((prev) => [...prev, s]);
  }

  // ─── Step: Init ────────────────────────────────────────────────────────────

  useEffect(() => {
    doInit();
  }, []);

  async function doInit() {
    try {
      if (process.getuid?.() !== 0) {
        setError("Recover must be run as root (sudo)");
        return;
      }
      const distro = await detectDistro();
      addStep({
        name: "System",
        status: "done",
        message: distro.prettyName,
      });
      setStep("docker");
    } catch (err: any) {
      setError(err.message);
    }
  }

  // ─── Step: Docker ──────────────────────────────────────────────────────────

  function DockerStep() {
    const [status, setStatus] = useState<
      "checking" | "confirm" | "installing" | "waiting" | "done"
    >("checking");

    useEffect(() => {
      checkDocker();
    }, []);

    async function checkDocker() {
      if (await isDockerInstalled()) {
        setStatus("waiting");
        if (await waitForDocker(5, 1000)) {
          setStatus("done");
          addStep({ name: "Docker", status: "done", message: "Ready" });
          setStep("rclone");
          return;
        }
      }
      if (autoYes) {
        await doInstall();
      } else {
        setStatus("confirm");
      }
    }

    async function doInstall() {
      setStatus("installing");
      try {
        await installDocker();
        setStatus("waiting");
        const ready = await waitForDocker();
        if (!ready) {
          setError("Docker daemon did not become ready in time");
          return;
        }
        setStatus("done");
        addStep({ name: "Docker", status: "done", message: "Installed" });
        setStep("rclone");
      } catch (err: any) {
        setError(`Docker install failed: ${err.message}`);
      }
    }

    return (
      <Box flexDirection="column">
        <StepIndicator current={1} total={TOTAL_STEPS} label="Docker" />
        {status === "checking" && (
          <Text>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {" "}Checking Docker...
          </Text>
        )}
        {status === "confirm" && (
          <Box flexDirection="column">
            <Text>Docker is not installed. Install it now?</Text>
            <ConfirmInput
              onConfirm={async () => {
                await doInstall();
              }}
              onCancel={() => {
                setError("Docker is required for recovery.");
              }}
            />
          </Box>
        )}
        {status === "installing" && (
          <Text>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            {" "}Installing Docker...
          </Text>
        )}
        {status === "waiting" && (
          <Text>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {" "}Waiting for Docker daemon...
          </Text>
        )}
      </Box>
    );
  }

  // ─── Step: rclone ──────────────────────────────────────────────────────────

  function RcloneStep() {
    const [status, setStatus] = useState<
      "checking" | "confirm" | "installing" | "done"
    >("checking");

    useEffect(() => {
      checkRclone();
    }, []);

    async function checkRclone() {
      if (await isRcloneInstalled()) {
        setStatus("done");
        addStep({ name: "rclone", status: "done", message: "Ready" });
        setStep("rclone-remote");
        return;
      }
      if (autoYes) {
        await doInstall();
      } else {
        setStatus("confirm");
      }
    }

    async function doInstall() {
      setStatus("installing");
      try {
        await installRclone();
        setStatus("done");
        addStep({ name: "rclone", status: "done", message: "Installed" });
        setStep("rclone-remote");
      } catch (err: any) {
        setError(`rclone install failed: ${err.message}`);
      }
    }

    return (
      <Box flexDirection="column">
        <StepIndicator current={2} total={TOTAL_STEPS} label="rclone" />
        {status === "checking" && (
          <Text>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {" "}Checking rclone...
          </Text>
        )}
        {status === "confirm" && (
          <Box flexDirection="column">
            <Text>rclone is not installed. Install it now?</Text>
            <ConfirmInput
              onConfirm={async () => {
                await doInstall();
              }}
              onCancel={() => {
                setError("rclone is required for remote backup recovery.");
              }}
            />
          </Box>
        )}
        {status === "installing" && (
          <Text>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            {" "}Installing rclone...
          </Text>
        )}
      </Box>
    );
  }

  // ─── Step: rclone remote ───────────────────────────────────────────────────

  function RcloneRemoteStep() {
    const [status, setStatus] = useState<
      "checking" | "not-configured" | "done"
    >("checking");

    useEffect(() => {
      checkRemote();
    }, []);

    async function checkRemote() {
      const result = await isRcloneRemoteConfigured(rcloneRemote);
      if (result.configured) {
        setStatus("done");
        addStep({
          name: "Remote",
          status: "done",
          message: `${rcloneRemote}: configured`,
        });
        setStep("base-dir");
      } else {
        if (autoYes) {
          setError(
            `rclone remote '${rcloneRemote}' not configured. Run 'rclone config' first.`,
          );
        } else {
          setStatus("not-configured");
        }
      }
    }

    function RetryPrompt() {
      useInput((_input, key) => {
        if (key.return) {
          setStatus("checking");
          checkRemote();
        }
      });
      return (
        <Box flexDirection="column">
          <Text color="yellow">
            rclone remote '{rcloneRemote}' is not configured.
          </Text>
          <Text>
            Open another terminal and run: <Text bold>rclone config</Text>
          </Text>
          <Text dimColor>Press Enter to retry...</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <StepIndicator
          current={3}
          total={TOTAL_STEPS}
          label="Remote Storage"
        />
        {status === "checking" && (
          <Text>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {" "}Checking rclone remote '{rcloneRemote}'...
          </Text>
        )}
        {status === "not-configured" && <RetryPrompt />}
      </Box>
    );
  }

  // ─── Step: Base directory ──────────────────────────────────────────────────

  function BaseDirStep() {
    const [value, setValue] = useState(baseDir);

    useEffect(() => {
      if (autoYes) {
        confirmBaseDir(baseDir);
      }
    }, []);

    async function confirmBaseDir(dir: string) {
      setBaseDir(dir);
      const updated: EnvConfig = {
        ...envConfig,
        BASE_DIR: dir,
      };
      setEnvConfig(updated);

      // Create data directory structure
      const dataDir = `${dir}/data`;
      const dataDirs = [
        `${dataDir}/downloads/movies`,
        `${dataDir}/downloads/tv`,
        `${dataDir}/downloads/music`,
        `${dataDir}/media/movies`,
        `${dataDir}/media/tv`,
        `${dataDir}/media/music`,
      ];
      for (const d of dataDirs) {
        await shell("mkdir", ["-p", d], { sudo: true });
      }

      // Write minimal .env
      await saveEnvConfig(updated);

      addStep({ name: "Base directory", status: "done", message: dir });
      setStep("discover");
    }

    if (autoYes) {
      return (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Setting up base directory: {baseDir}
        </Text>
      );
    }

    return (
      <Box flexDirection="column">
        <StepIndicator
          current={4}
          total={TOTAL_STEPS}
          label="Base Directory"
        />
        <Text>
          Enter the base directory for Docker app data:
        </Text>
        <Box>
          <Text color="blue">{">"} </Text>
          <TextInput defaultValue={value} onSubmit={confirmBaseDir} />
        </Box>
      </Box>
    );
  }

  // ─── Step: Discover remote backups ─────────────────────────────────────────

  function DiscoverStep() {
    useEffect(() => {
      discover();
    }, []);

    async function discover() {
      try {
        const result = await discoverRemoteBackups(rcloneRemote);
        if (!result || result.apps.length === 0) {
          setError("No remote backups found");
          return;
        }
        setDiscovered(result);
        const appList = result.apps.filter((a) => a !== "secrets");
        addStep({
          name: "Discovery",
          status: "done",
          message: `${result.date}: ${appList.join(", ")}${result.apps.includes("secrets") ? " + secrets" : ""}`,
        });

        if (autoYes) {
          doRestore(result);
        } else {
          setStep("confirm");
        }
      } catch (err: any) {
        setError(`Failed to discover backups: ${err.message}`);
      }
    }

    return (
      <Box flexDirection="column">
        <StepIndicator
          current={5}
          total={TOTAL_STEPS}
          label="Discover Backups"
        />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Discovering remote backups...
        </Text>
      </Box>
    );
  }

  // ─── Step: Confirm ─────────────────────────────────────────────────────────

  function ConfirmStep() {
    if (!discovered) return null;
    const appList = discovered.apps.filter((a) => a !== "secrets");

    function handleConfirm() {
      doRestore(discovered!);
    }

    function handleCancel() {
      exit();
    }

    return (
      <Box flexDirection="column">
        <StepIndicator current={6} total={TOTAL_STEPS} label="Confirm" />
        <Text>
          Recover from <Text bold>{discovered.date}</Text> backup:
        </Text>
        <Text>{"  "}{appList.join(", ")}</Text>
        {discovered.apps.includes("secrets") && (
          <Text dimColor>{"  "}(secrets will be restored first)</Text>
        )}
        <Text />
        <Text>
          This will download all backups and recreate all services.
        </Text>
        <Box marginTop={1}>
          <Text>Continue? </Text>
          <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
        </Box>
      </Box>
    );
  }

  // ─── Restore logic ─────────────────────────────────────────────────────────

  async function doRestore(disc: { date: string; apps: string[] }) {
    setStep("restoring");
    const failed: string[] = [];
    const logger = createRestoreLogger();

    // Restore secrets first
    if (disc.apps.includes("secrets")) {
      setCurrentLabel("Restoring secrets...");
      try {
        const remotePath = `/backups/archive/${disc.date}/secrets.tar.zst`;
        const { localPath, tempDir } = await downloadBackup(
          rcloneRemote,
          remotePath,
        );
        const projectRoot = getProjectRoot();
        await extractBackup(localPath, projectRoot);
        await shell("rm", ["-rf", tempDir]);
        addStep({ name: "Secrets", status: "done" });
        await logger.info("Restored secrets");
      } catch (err: any) {
        addStep({
          name: "Secrets",
          status: "error",
          message: err.message,
        });
      }
    }

    // Reload config after secrets restore
    const reloadedEnv = await loadEnvConfig();
    const finalEnv = { ...envConfig, ...reloadedEnv };
    setEnvConfig(finalEnv);

    // Restore each app
    const appNames = disc.apps.filter((a) => a !== "secrets");
    setRestoreProgress({ current: 0, total: appNames.length });

    for (let i = 0; i < appNames.length; i++) {
      const appName = appNames[i];
      const app = getApp(appName);
      if (!app) {
        addStep({
          name: appName,
          status: "skipped",
          message: "Unknown app",
        });
        continue;
      }

      setRestoreProgress({ current: i, total: appNames.length });
      setCurrentLabel(`Downloading ${app.displayName}...`);

      try {
        // Download
        const remotePath = `/backups/archive/${disc.date}/${appName}.tar.zst`;
        const { localPath, tempDir } = await downloadBackup(
          rcloneRemote,
          remotePath,
        );

        // Extract
        setCurrentLabel(`Extracting ${app.displayName}...`);
        await extractBackup(localPath, finalEnv.BASE_DIR);
        await shell("rm", ["-rf", tempDir]);

        // Generate compose and start
        setCurrentLabel(`Starting ${app.displayName}...`);
        await writeComposeAndStart(app, finalEnv);

        addStep({ name: app.displayName, status: "done" });
        await logger.info(`Restored and started ${app.displayName}`);
      } catch (err: any) {
        failed.push(appName);
        addStep({
          name: app.displayName,
          status: "error",
          message: err.message,
        });
        await logger.warn(
          `Failed to restore ${app.displayName}: ${err.message}`,
        );
      }
    }

    setRestoreProgress({ current: appNames.length, total: appNames.length });
    setFailedApps(failed);

    // Systemd timer
    setStep("systemd");
  }

  // ─── Step: Systemd ─────────────────────────────────────────────────────────

  function SystemdStep() {
    useEffect(() => {
      setupSystemd();
    }, []);

    async function setupSystemd() {
      const systemdAvailable = await hasSystemd();
      const wsl = await isWsl();

      if (!systemdAvailable || wsl) {
        addStep({
          name: "Backup Timer",
          status: "skipped",
          message: "systemd not available",
        });
        setStep("summary");
        return;
      }

      try {
        await installSystemdUnits();
        addStep({
          name: "Backup Timer",
          status: "done",
          message: "Daily at 2:00 AM",
        });
      } catch {
        addStep({
          name: "Backup Timer",
          status: "skipped",
          message: "Failed to install",
        });
      }

      setStep("summary");
    }

    return (
      <Box flexDirection="column">
        <StepIndicator
          current={8}
          total={TOTAL_STEPS}
          label="Backup Service"
        />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Setting up backup timer...
        </Text>
      </Box>
    );
  }

  // ─── Step: Summary ─────────────────────────────────────────────────────────

  function SummaryStep() {
    useEffect(() => {
      const timer = setTimeout(() => {
        process.exitCode = failedApps.length > 0 ? 1 : 0;
        exit();
      }, 1500);
      return () => clearTimeout(timer);
    }, []);

    return (
      <Box flexDirection="column">
        <StepIndicator current={9} total={TOTAL_STEPS} label="Complete" />
        {failedApps.length > 0 ? (
          <StatusMessage variant="warning">
            Recovery completed with {failedApps.length} failure(s):{" "}
            {failedApps.join(", ")}
          </StatusMessage>
        ) : (
          <StatusMessage variant="success">
            Recovery complete — all services restored from{" "}
            {discovered?.date ?? "backup"}
          </StatusMessage>
        )}
      </Box>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Recover" />
        {completedSteps.map((cs, i) => (
          <AppStatus
            key={i}
            name={cs.name}
            status={cs.status}
            message={cs.message}
          />
        ))}
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Disaster Recovery" />

      {/* Persistent completed steps */}
      {completedSteps.map((cs, i) => (
        <AppStatus
          key={i}
          name={cs.name}
          status={cs.status}
          message={cs.message}
        />
      ))}

      {step === "init" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Initializing...
        </Text>
      )}
      {step === "docker" && <DockerStep />}
      {step === "rclone" && <RcloneStep />}
      {step === "rclone-remote" && <RcloneRemoteStep />}
      {step === "base-dir" && <BaseDirStep />}
      {step === "discover" && <DiscoverStep />}
      {step === "confirm" && <ConfirmStep />}
      {step === "restoring" && (
        <Box flexDirection="column">
          <StepIndicator current={7} total={TOTAL_STEPS} label="Restoring" />
          <Text>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            {" "}{currentLabel}
          </Text>
          {restoreProgress.total > 1 && (
            <ProgressBar
              percent={
                (restoreProgress.current / restoreProgress.total) * 100
              }
              label={`${restoreProgress.current}/${restoreProgress.total} apps`}
            />
          )}
        </Box>
      )}
      {step === "systemd" && <SystemdStep />}
      {step === "summary" && <SummaryStep />}
    </Box>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runRecover(
  _args: string[],
  flags: { yes?: boolean },
): Promise<void> {
  const autoYes = flags.yes ?? false;

  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(
      <ErrorBoundary>
        <RecoverCommand autoYes={autoYes} />
      </ErrorBoundary>,
    );
    await waitUntilExit();
  } else {
    await runHeadlessRecover(autoYes);
  }
}
