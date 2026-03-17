import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { join } from "path";
import { existsSync } from "fs";
import { getProjectRoot, loadEnvConfig } from "@/lib/config.js";
import { isContainerRunning, composeUp, composeDown } from "@/lib/docker.js";
import { getDuckDnsDomain, regenerateCaddyfile } from "@/lib/caddy.js";
import { getLocalIp } from "@/lib/distro.js";
import { shell } from "@/lib/shell.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";

function getUiComposePath(): string {
  return join(getProjectRoot(), "ui", "docker-compose.yml");
}

function getUiUrl(envConfig: { ENABLE_HTTPS?: string; DUCKDNS_SUBDOMAINS?: string }, localIp: string): string {
  if (envConfig.ENABLE_HTTPS === "true") {
    const domain = getDuckDnsDomain(envConfig as any);
    if (domain) return `https://mithrandir.${domain}`;
  }
  return `http://${localIp}:4180`;
}

function UiStart() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"init" | "building" | "starting" | "done">("init");
  const [steps, setSteps] = useState<{ name: string; status: "done" | "error" }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  function addStep(name: string, status: "done" | "error") {
    setSteps((prev) => [...prev, { name, status }]);
  }

  useEffect(() => {
    run();
  }, []);

  async function run() {
    const composePath = getUiComposePath();
    if (!existsSync(composePath)) {
      setError("ui/docker-compose.yml not found. Is the repo intact?");
      return;
    }

    const envConfig = await loadEnvConfig();
    const localIp = await getLocalIp();
    const uiUrl = getUiUrl(envConfig, localIp);
    setUrl(uiUrl);

    const running = await isContainerRunning("mithrandir-ui");
    if (running) {
      setUrl(uiUrl);
      setPhase("done");
      addStep("Already running", "done");
      const t = setTimeout(() => exit(), 100);
      t.unref();
      return;
    }

    const uiCwd = join(getProjectRoot(), "ui");
    const repoRoot = getProjectRoot();
    // Docker Compose reads .env from CWD for YAML interpolation.
    // The root .env has BASE_DIR/BACKUP_DIR but CWD is ui/, so we
    // point docker compose to the root .env with --env-file.
    const envFile = join(repoRoot, ".env");

    setPhase("building");
    const build = await shell("docker", ["compose", "--env-file", envFile, "build"], {
      sudo: true,
      cwd: uiCwd,
      ignoreError: true,
    });
    if ((build.exitCode ?? 0) !== 0) {
      setError(`Build failed: ${build.stderr?.trim() || "unknown error"}`);
      return;
    }
    addStep("Build UI image", "done");

    setPhase("starting");
    try {
      await shell("docker", ["compose", "--env-file", envFile, "up", "-d"], {
        sudo: true,
        cwd: uiCwd,
        env: { HOMELAB_ROOT: repoRoot },
      });
    } catch (err: any) {
      setError(`Failed to start container: ${err.stderr?.trim() || err.message || "unknown error"}`);
      return;
    }
    try {
      await regenerateCaddyfile(envConfig);
    } catch {
      // Caddyfile regeneration is non-critical
    }
    addStep("Start container", "done");

    setPhase("done");
    const t = setTimeout(() => exit(), 500);
    t.unref();
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="UI" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="UI" />

      {steps.map((step, idx) => (
        <AppStatus key={idx} name={step.name} status={step.status} />
      ))}

      {phase !== "done" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{phase === "building" ? "Building UI..." : phase === "starting" ? "Starting container..." : "Initializing..."}
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            UI is running at {url}
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

function UiStopDisplay() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"init" | "stopping" | "done">("init");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    run();
  }, []);

  async function run() {
    const composePath = getUiComposePath();
    if (!existsSync(composePath)) {
      setError("ui/docker-compose.yml not found.");
      return;
    }

    const running = await isContainerRunning("mithrandir-ui");
    if (!running) {
      setInfo("UI is not running.");
      const t = setTimeout(() => exit(), 100);
      t.unref();
      return;
    }

    const repoRoot = getProjectRoot();
    const envFile = join(repoRoot, ".env");

    setPhase("stopping");
    try {
      await shell("docker", ["compose", "--env-file", envFile, "down"], {
        sudo: true,
        cwd: join(repoRoot, "ui"),
        env: { HOMELAB_ROOT: repoRoot },
      });
    } catch (err: any) {
      setError(`Failed to stop container: ${err.stderr?.trim() || err.message || "unknown error"}`);
      return;
    }

    try {
      const envConfig = await loadEnvConfig();
      await regenerateCaddyfile(envConfig);
    } catch {
      // Caddyfile regeneration is non-critical
    }

    setPhase("done");
    const t = setTimeout(() => exit(), 500);
    t.unref();
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="UI" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  if (info) {
    return (
      <Box flexDirection="column">
        <Header title="UI" />
        <StatusMessage variant="info">{info}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="UI" />

      {phase === "done" && (
        <AppStatus name="Stop UI container" status="done" />
      )}

      {(phase === "init" || phase === "stopping") && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Stopping UI...
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            UI stopped
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

export async function runUi(): Promise<void> {
  const { waitUntilExit } = render(<UiStart />);
  await waitUntilExit();
}

export async function runUiStop(): Promise<void> {
  const { waitUntilExit } = render(<UiStopDisplay />);
  await waitUntilExit();
}
