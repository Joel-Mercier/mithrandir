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

function getDocsComposePath(): string {
  return join(getProjectRoot(), "docs", "docker-compose.yml");
}

function getDocsUrl(envConfig: { ENABLE_HTTPS?: string; DUCKDNS_SUBDOMAINS?: string }, localIp: string): string {
  if (envConfig.ENABLE_HTTPS === "true") {
    const domain = getDuckDnsDomain(envConfig as any);
    if (domain) return `https://mithrandir-docs.${domain}`;
  }
  return `http://${localIp}:4173`;
}

function DocsStart() {
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
    const composePath = getDocsComposePath();
    if (!existsSync(composePath)) {
      setError("docs/docker-compose.yml not found. Is the repo intact?");
      return;
    }

    const envConfig = await loadEnvConfig();
    const localIp = await getLocalIp();
    const docsUrl = getDocsUrl(envConfig, localIp);
    setUrl(docsUrl);

    const running = await isContainerRunning("mithrandir-docs");
    if (running) {
      setUrl(docsUrl);
      setPhase("done");
      addStep("Already running", "done");
      const t = setTimeout(() => exit(), 100);
      t.unref();
      return;
    }

    setPhase("building");
    const build = await shell("docker", ["compose", "build"], {
      sudo: true,
      cwd: join(getProjectRoot(), "docs"),
      ignoreError: true,
    });
    if ((build.exitCode ?? 0) !== 0) {
      setError(`Build failed: ${build.stderr?.trim() || "unknown error"}`);
      return;
    }
    addStep("Build docs image", "done");

    setPhase("starting");
    await composeUp(composePath);
    await regenerateCaddyfile(envConfig);
    addStep("Start container", "done");

    setPhase("done");
    const t = setTimeout(() => exit(), 500);
    t.unref();
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Docs" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Docs" />

      {steps.map((step, idx) => (
        <AppStatus key={idx} name={step.name} status={step.status} />
      ))}

      {phase !== "done" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{phase === "building" ? "Building docs site..." : phase === "starting" ? "Starting container..." : "Initializing..."}
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Docs site is running at {url}
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

function DocsStopDisplay() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"init" | "stopping" | "done">("init");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    run();
  }, []);

  async function run() {
    const composePath = getDocsComposePath();
    if (!existsSync(composePath)) {
      setError("docs/docker-compose.yml not found.");
      return;
    }

    const running = await isContainerRunning("mithrandir-docs");
    if (!running) {
      setInfo("Docs site is not running.");
      const t = setTimeout(() => exit(), 100);
      t.unref();
      return;
    }

    setPhase("stopping");
    await composeDown(composePath);

    const envConfig = await loadEnvConfig();
    await regenerateCaddyfile(envConfig);

    setPhase("done");
    const t = setTimeout(() => exit(), 500);
    t.unref();
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Docs" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  if (info) {
    return (
      <Box flexDirection="column">
        <Header title="Docs" />
        <StatusMessage variant="info">{info}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Docs" />

      {phase === "done" && (
        <AppStatus name="Stop docs container" status="done" />
      )}

      {(phase === "init" || phase === "stopping") && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Stopping docs site...
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Docs site stopped
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

export async function runDocs(): Promise<void> {
  const { waitUntilExit } = render(<DocsStart />);
  await waitUntilExit();
}

export async function runDocsStop(): Promise<void> {
  const { waitUntilExit } = render(<DocsStopDisplay />);
  await waitUntilExit();
}
