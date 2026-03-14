import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { getApp, getAppNames, getContainerName, getComposePath } from "@/lib/apps.js";
import { isContainerRunning, composeDown } from "@/lib/docker.js";
import { loadEnvConfig } from "@/lib/config.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";

function StopApp({ appName }: { appName: string }) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"init" | "stopping" | "done">("init");
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

    const containerName = getContainerName(app);
    if (!(await isContainerRunning(containerName))) {
      setInfo(`Container '${containerName}' is not running.`);
      const t = setTimeout(() => exit(), 100);
      t.unref();
      return;
    }

    const env = await loadEnvConfig();
    const composePath = getComposePath(app, env.BASE_DIR);

    setPhase("stopping");
    try {
      await composeDown(composePath);
    } catch (err: any) {
      setError(`Failed to stop ${appName}: ${err.stderr || err.message}`);
      return;
    }

    setPhase("done");
    const t = setTimeout(() => exit(), 500);
    t.unref();
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title={`Stop: ${appName}`} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  if (info) {
    return (
      <Box flexDirection="column">
        <Header title={`Stop: ${appName}`} />
        <StatusMessage variant="info">{info}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title={`Stop: ${appName}`} />

      {phase === "done" && (
        <AppStatus name="Stop container" status="done" message={appName} />
      )}

      {(phase === "init" || phase === "stopping") && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Stopping {appName}...
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            {appName} stopped successfully
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

export async function runStop(args: string[]): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir stop <app>\nAvailable apps: ${getAppNames().join(", ")}`,
    );
    process.exit(1);
  }

  const { waitUntilExit } = render(<StopApp appName={appName} />);
  await waitUntilExit();
}
