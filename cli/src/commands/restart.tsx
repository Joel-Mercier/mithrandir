import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { existsSync } from "fs";
import { getApp, getAppNames, getContainerName, getComposePath } from "../lib/apps.js";
import { isContainerRunning, composeDown, composeUp } from "../lib/docker.js";
import { loadEnvConfig } from "../lib/config.js";
import { Header } from "../components/Header.js";
import { AppStatus } from "../components/AppStatus.js";

interface CompletedStep {
  name: string;
  status: "done" | "error";
  message?: string;
}

function RestartApp({ appName }: { appName: string }) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"init" | "stopping" | "starting" | "done">("init");
  const [currentLabel, setCurrentLabel] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);

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

    if (!existsSync(composePath)) {
      setError(`App '${appName}' is not installed (no docker-compose.yml found).`);
      return;
    }

    const containerName = getContainerName(app);
    if (!(await isContainerRunning(containerName))) {
      setError(`Container '${containerName}' is not running. Use 'mithrandir start ${appName}' instead.`);
      return;
    }

    // Stop
    setPhase("stopping");
    setCurrentLabel(`Stopping ${appName}...`);
    await composeDown(composePath);
    addStep({ name: "Stop container", status: "done", message: appName });

    // Start
    setPhase("starting");
    setCurrentLabel(`Starting ${appName}...`);
    await composeUp(composePath);
    addStep({ name: "Start container", status: "done", message: appName });

    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title={`Restart: ${appName}`} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title={`Restart: ${appName}`} />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {(phase === "init" || phase === "stopping" || phase === "starting") && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{currentLabel}
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Restart of '{appName}' complete
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

export async function runRestart(args: string[]): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir restart <app>\nAvailable apps: ${getAppNames().join(", ")}`,
    );
    process.exit(1);
  }

  if (process.getuid?.() !== 0) {
    console.error("Error: This command must be run as root (use sudo).");
    process.exit(1);
  }

  const { waitUntilExit } = render(<RestartApp appName={appName} />);
  await waitUntilExit();
}
