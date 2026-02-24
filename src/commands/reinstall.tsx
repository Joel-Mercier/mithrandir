import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { ConfirmInput, StatusMessage } from "@inkjs/ui";
import { existsSync } from "fs";
import { getApp, getAppNames, getAppDir, getComposePath, getContainerName } from "@/lib/apps.js";
import { shell } from "@/lib/shell.js";
import { loadEnvConfig } from "@/lib/config.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";
import { writeComposeAndStart } from "@/commands/setup.js";
import type { EnvConfig } from "@/types.js";

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

function ReinstallInteractive({
  appName,
  autoYes,
}: {
  appName: string;
  autoYes: boolean;
}) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<
    "init" | "stopping" | "confirm-delete" | "deleting" | "reinstalling" | "done"
  >("init");
  const [currentLabel, setCurrentLabel] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [appDir, setAppDir] = useState("");
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);

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
    setEnvConfig(env);
    const dir = getAppDir(app, env.BASE_DIR);
    setAppDir(dir);

    const composePath = getComposePath(app, env.BASE_DIR);
    if (!existsSync(composePath)) {
      setError(`App '${appName}' is not installed (no docker-compose.yml found).`);
      return;
    }

    // Phase 1: Stop and remove container
    setPhase("stopping");
    setCurrentLabel(`Stopping ${appName} container...`);
    await shell("docker", ["compose", "down", "--volumes"], { cwd: dir, ignoreError: true });

    // Remove the docker image for this app
    const containerName = getContainerName(app);
    await shell("docker", ["rm", "-f", containerName], { sudo: true, ignoreError: true });
    await shell("docker", ["image", "rm", "-f", app.image], { sudo: true, ignoreError: true });
    await shell("docker", ["network", "prune", "-f"], { sudo: true, ignoreError: true });
    addStep({ name: "Stop container", status: "done", message: "Container stopped and image removed" });

    // Phase 2: Ask about removing data
    if (autoYes) {
      await deleteAndReinstall(dir, env);
    } else {
      setPhase("confirm-delete");
    }
  }

  async function deleteAndReinstall(dir: string, env: EnvConfig) {
    setPhase("deleting");
    setCurrentLabel("Removing app data...");
    await shell("rm", ["-rf", dir]);
    addStep({ name: "Remove data", status: "done", message: `Removed ${dir}` });

    await reinstall(env);
  }

  async function reinstall(env: EnvConfig) {
    const app = getApp(appName)!;
    setPhase("reinstalling");
    setCurrentLabel(`Reinstalling ${appName}...`);
    await writeComposeAndStart(app, env);
    addStep({ name: "Reinstall", status: "done", message: `${appName} is running` });

    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  function handleConfirmDelete() {
    deleteAndReinstall(appDir, envConfig!);
  }

  function handleCancelDelete() {
    addStep({ name: "Remove data", status: "skipped", message: `Kept ${appDir}` });
    reinstall(envConfig!);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title={`Reinstall: ${appName}`} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title={`Reinstall: ${appName}`} />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {(phase === "init" || phase === "stopping" || phase === "deleting" || phase === "reinstalling") && (
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
          <Text>Remove app data before reinstalling? (No = keep existing data)</Text>
          <Box marginTop={1}>
            <Text>Remove data? </Text>
            <ConfirmInput onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />
          </Box>
        </Box>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Reinstall of '{appName}' complete
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

export async function runReinstall(
  args: string[],
  flags: { yes?: boolean },
): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir reinstall <app>\nAvailable apps: ${getAppNames().join(", ")}`,
    );
    process.exit(1);
  }

  // Root check
  if (process.getuid?.() !== 0) {
    console.error("Error: This command must be run as root (use sudo).");
    process.exit(1);
  }

  const autoYes = flags.yes ?? false;
  const { waitUntilExit } = render(
    <ReinstallInteractive appName={appName} autoYes={autoYes} />,
  );
  await waitUntilExit();
}
