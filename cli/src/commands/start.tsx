import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { existsSync } from "fs";
import { getApp, getAppNames, getContainerName, getComposePath } from "@/lib/apps.js";
import { isContainerRunning, composeUp } from "@/lib/docker.js";
import { loadEnvConfig } from "@/lib/config.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";

function StartApp({ appName }: { appName: string }) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"init" | "starting" | "done">("init");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    if (await isContainerRunning(containerName)) {
      setInfo(`Container '${containerName}' is already running.`);
      const t = setTimeout(() => exit(), 100);
      t.unref();
      return;
    }

    setPhase("starting");
    try {
      await composeUp(composePath);
    } catch (err: any) {
      setError(`Failed to start ${appName}: ${err.stderr || err.message}`);
      return;
    }

    setPhase("done");
    const t = setTimeout(() => exit(), 500);
    t.unref();
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title={`Start: ${appName}`} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  if (info) {
    return (
      <Box flexDirection="column">
        <Header title={`Start: ${appName}`} />
        <StatusMessage variant="info">{info}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title={`Start: ${appName}`} />

      {phase === "done" && (
        <AppStatus name="Start container" status="done" message={appName} />
      )}

      {(phase === "init" || phase === "starting") && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Starting {appName}...
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            {appName} started successfully
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

export async function runStart(args: string[]): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir start <app>\nAvailable apps: ${getAppNames().join(", ")}`,
    );
    process.exit(1);
  }

  const { waitUntilExit } = render(<StartApp appName={appName} />);
  await waitUntilExit();
}
