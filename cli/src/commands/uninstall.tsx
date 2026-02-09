import React, { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { ConfirmInput } from "@inkjs/ui";
import Spinner from "ink-spinner";
import {
  getApp,
  getAppNames,
  getAppDir,
  getContainerName,
  getComposePath,
} from "../lib/apps.js";
import {
  stopContainer,
  removeContainer,
  containerExists,
} from "../lib/docker.js";
import { shell } from "../lib/shell.js";
import { loadEnvConfig } from "../lib/config.js";
import { Header } from "../components/Header.js";
import { AppStatus } from "../components/AppStatus.js";
import type { EnvConfig } from "../types.js";

interface UninstallCommandProps {
  app?: string;
  flags: { yes?: boolean };
}

export function UninstallCommand({ app: appName, flags }: UninstallCommandProps) {
  const autoYes = flags.yes ?? false;
  const { exit } = useApp();

  const [phase, setPhase] = useState<
    "validating" | "confirm" | "confirm-data" | "uninstalling" | "done" | "error"
  >("validating");
  const [error, setError] = useState("");
  const [deleteData, setDeleteData] = useState(false);
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);

  if (!appName) {
    return (
      <Box flexDirection="column">
        <Text bold>Usage: homelab uninstall {"<app>"}</Text>
        <Text />
        <Text>Apps: {getAppNames().join(", ")}</Text>
      </Box>
    );
  }

  const app = getApp(appName);
  if (!app) {
    return (
      <Box flexDirection="column">
        <Text color="red">Unknown app: {appName}</Text>
        <Text dimColor>Valid apps: {getAppNames().join(", ")}</Text>
      </Box>
    );
  }

  useEffect(() => {
    validate();
  }, []);

  async function validate() {
    const env = await loadEnvConfig();
    setEnvConfig(env);

    const containerName = getContainerName(app!);
    const exists = await containerExists(containerName);

    if (!exists) {
      setError(`Container "${containerName}" does not exist`);
      setPhase("error");
      return;
    }

    if (autoYes) {
      await doUninstall(env, false);
    } else {
      setPhase("confirm");
    }
  }

  function handleConfirm() {
    setPhase("confirm-data");
  }

  function handleConfirmCancel() {
    exit();
  }

  function handleDeleteData() {
    setDeleteData(true);
    doUninstall(envConfig!, true);
  }

  function handleKeepData() {
    doUninstall(envConfig!, false);
  }

  async function doUninstall(env: EnvConfig, removeData: boolean) {
    setPhase("uninstalling");
    try {
      const containerName = getContainerName(app!);
      const appDir = getAppDir(app!, env.BASE_DIR);

      // Stop and remove container
      await stopContainer(containerName);
      await removeContainer(containerName);

      // Optionally remove data
      if (removeData) {
        await shell("rm", ["-rf", appDir], { sudo: true });
      }

      setPhase("done");
      setTimeout(() => exit(), 100);
    } catch (err: any) {
      setError(err.message);
      setPhase("error");
    }
  }

  return (
    <Box flexDirection="column">
      <Header title="Uninstall" />

      {phase === "validating" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Checking {app.displayName}...
        </Text>
      )}

      {phase === "confirm" && (
        <Box flexDirection="column">
          <Text>Stop and remove the <Text bold>{app.displayName}</Text> container?</Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirm} onCancel={handleConfirmCancel} />
          </Box>
        </Box>
      )}

      {phase === "confirm-data" && (
        <Box flexDirection="column">
          <Text>Also delete all {app.displayName} data and configuration?</Text>
          <Text dimColor>(This cannot be undone)</Text>
          <Box marginTop={1}>
            <Text>Delete data? </Text>
            <ConfirmInput onConfirm={handleDeleteData} onCancel={handleKeepData} />
          </Box>
        </Box>
      )}

      {phase === "uninstalling" && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text>
          {" "}Removing {app.displayName}...
        </Text>
      )}

      {phase === "done" && (
        <AppStatus
          name={app.displayName}
          status="done"
          message={deleteData ? "Removed (data deleted)" : "Removed (data kept)"}
        />
      )}

      {phase === "error" && (
        <Text color="red">Error: {error}</Text>
      )}
    </Box>
  );
}
