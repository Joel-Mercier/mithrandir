import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { existsSync } from "fs";
import { getApp, getAppNames, getComposePath } from "@/lib/apps.js";
import { loadEnvConfig } from "@/lib/config.js";
import { pullImageWithProgress } from "@/lib/docker.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";
import { ProgressBar } from "@/components/ProgressBar.js";
import { writeComposeAndStart } from "@/commands/setup.js";

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

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

export async function runInstall(args: string[]): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir install <app>\nAvailable apps: ${getAppNames().join(", ")}`,
    );
    process.exit(1);
  }

  if (process.getuid?.() !== 0) {
    console.error("Error: This command must be run as root (use sudo).");
    process.exit(1);
  }

  const { waitUntilExit } = render(<InstallApp appName={appName} />);
  await waitUntilExit();
}
