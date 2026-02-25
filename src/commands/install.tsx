import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { existsSync } from "fs";
import { getApp, getAppNames, getComposePath } from "@/lib/apps.js";
import { loadEnvConfig } from "@/lib/config.js";
import {
  isDockerInstalled,
  waitForDocker,
  installDocker,
  pullImageWithProgress,
} from "@/lib/docker.js";
import { getSwapInfo, ensureSwap, formatSwapSize } from "@/lib/swap.js";
import { isRcloneInstalled, installRclone } from "@/lib/rclone.js";
import {
  hasSystemd,
  isWsl,
  installSystemdUnits,
  isTimerActive,
} from "@/lib/systemd.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";
import { ProgressBar } from "@/components/ProgressBar.js";
import { writeComposeAndStart } from "@/commands/setup.js";

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

// ─── Install Docker ──────────────────────────────────────────────────────────

function InstallDocker() {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"checking" | "installing" | "waiting" | "swap" | "done">("checking");
  const [error, setError] = useState<string | null>(null);

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  async function configureSwap() {
    setPhase("swap");
    const twoGB = 2 * 1024 * 1024 * 1024;
    const info = await getSwapInfo();
    if (info && info.totalBytes >= twoGB) {
      addStep({ name: "Swap", status: "done", message: `Already sufficient (${formatSwapSize(info.totalBytes)})` });
      return;
    }
    try {
      await ensureSwap(2);
      addStep({ name: "Swap", status: "done", message: "Configured 2 GB" });
    } catch {
      addStep({ name: "Swap", status: "error", message: "Failed to configure (non-fatal)" });
    }
  }

  useEffect(() => {
    run();
  }, []);

  async function run() {
    // Check if already installed
    if (await isDockerInstalled()) {
      setPhase("waiting");
      if (await waitForDocker(5, 1000)) {
        addStep({ name: "Docker", status: "done", message: "Already installed and running" });
        await configureSwap();
        setPhase("done");
        setTimeout(() => exit(), 500);
        return;
      }
    }

    // Install Docker
    setPhase("installing");
    try {
      await installDocker();
      addStep({ name: "Install Docker", status: "done", message: "Installed" });
    } catch (err: any) {
      setError(`Docker install failed: ${err.message}`);
      return;
    }

    // Wait for daemon
    setPhase("waiting");
    const ready = await waitForDocker();
    if (!ready) {
      setError("Docker daemon did not become ready in time.");
      return;
    }
    addStep({ name: "Docker daemon", status: "done", message: "Ready" });

    await configureSwap();
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Install: docker" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Install: docker" />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {phase === "checking" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Checking Docker...
        </Text>
      )}
      {phase === "installing" && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text>
          {" "}Installing Docker...
        </Text>
      )}
      {phase === "waiting" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Waiting for Docker daemon...
        </Text>
      )}
      {phase === "swap" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Checking swap configuration...
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Docker is installed and running
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

// ─── Install Backup (rclone + systemd) ───────────────────────────────────────

function InstallBackup() {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"rclone-check" | "rclone-install" | "systemd" | "done">("rclone-check");
  const [error, setError] = useState<string | null>(null);

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    run();
  }, []);

  async function run() {
    // ── rclone ──────────────────────────────────────────────────────────
    if (await isRcloneInstalled()) {
      addStep({ name: "rclone", status: "done", message: "Already installed" });
    } else {
      setPhase("rclone-install");
      try {
        await installRclone();
        addStep({ name: "rclone", status: "done", message: "Installed" });
      } catch (err: any) {
        setError(`rclone install failed: ${err.message}`);
        return;
      }
    }

    // ── systemd backup timer ────────────────────────────────────────────
    setPhase("systemd");
    const systemdAvailable = await hasSystemd();
    const wsl = await isWsl();

    if (!systemdAvailable || wsl) {
      addStep({
        name: "Backup timer",
        status: "skipped",
        message: systemdAvailable ? "WSL detected (systemd timers not reliable)" : "systemd not available",
      });
    } else {
      const alreadyActive = await isTimerActive();
      if (alreadyActive) {
        addStep({ name: "Backup timer", status: "done", message: "Already active (daily at 2:00 AM)" });
      } else {
        try {
          await installSystemdUnits();
          addStep({ name: "Backup timer", status: "done", message: "Installed (daily at 2:00 AM)" });
        } catch {
          addStep({ name: "Backup timer", status: "skipped", message: "Failed to install" });
        }
      }
    }

    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Install: backup" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Install: backup" />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {phase === "rclone-check" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Checking rclone...
        </Text>
      )}
      {phase === "rclone-install" && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text>
          {" "}Installing rclone...
        </Text>
      )}
      {phase === "systemd" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Setting up backup timer...
        </Text>
      )}

      {phase === "done" && (
        <Box flexDirection="column" marginTop={1}>
          <StatusMessage variant="success">
            Backup system is ready
          </StatusMessage>
          <Text dimColor>  To configure rclone for Google Drive, run: rclone config</Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Install App ─────────────────────────────────────────────────────────────

function InstallApp({ appName }: { appName: string }) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"init" | "pulling" | "installing" | "done">("init");
  const [currentLabel, setCurrentLabel] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState(0);

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
    const composePath = getComposePath(app, env.BASE_DIR);

    if (existsSync(composePath)) {
      setError(`App '${appName}' is already installed. Use 'mithrandir reinstall ${appName}' to reinstall.`);
      return;
    }

    // Pull image
    setPhase("pulling");
    setCurrentLabel(`Pulling ${app.image}...`);
    setPullProgress(0);
    await pullImageWithProgress(app.image, (pct) => setPullProgress(pct));
    addStep({ name: "Pull image", status: "done", message: app.image });

    // Install
    setPhase("installing");
    setCurrentLabel(`Installing ${appName}...`);
    await writeComposeAndStart(app, env);
    addStep({ name: "Install", status: "done", message: `${appName} is running` });

    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title={`Install: ${appName}`} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title={`Install: ${appName}`} />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {(phase === "init" || phase === "pulling" || phase === "installing") && (
        <Box flexDirection="column">
          <Text>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {" "}{currentLabel}
          </Text>
          {phase === "pulling" && pullProgress > 0 && pullProgress < 100 && (
            <ProgressBar percent={pullProgress} />
          )}
        </Box>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Install of '{appName}' complete
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const SPECIAL_TARGETS = ["docker", "backup"];

export async function runInstall(args: string[]): Promise<void> {
  const target = args[0];

  if (!target) {
    console.error(
      `Usage: mithrandir install <target>\n\nTargets:\n  docker                Install Docker engine\n  backup                Install rclone and backup systemd timer\n  <app>                 Install a single app\n\nAvailable apps: ${getAppNames().join(", ")}`,
    );
    process.exit(1);
  }

  if (process.getuid?.() !== 0) {
    console.error("Error: This command must be run as root (use sudo).");
    process.exit(1);
  }

  if (target === "docker") {
    const { waitUntilExit } = render(<InstallDocker />);
    await waitUntilExit();
  } else if (target === "backup") {
    const { waitUntilExit } = render(<InstallBackup />);
    await waitUntilExit();
  } else {
    const { waitUntilExit } = render(<InstallApp appName={target} />);
    await waitUntilExit();
  }
}
