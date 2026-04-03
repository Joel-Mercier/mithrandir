import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import { getProjectRoot, loadEnvConfig } from "@/lib/config.js";
import { getDuckDnsDomain, regenerateCaddyfile } from "@/lib/caddy.js";
import { getLocalIp } from "@/lib/distro.js";
import { shell } from "@/lib/shell.js";
import { isUiServiceActive, installUiService } from "@/lib/systemd-ui.js";
import { installTusdService, isTusdServiceActive } from "@/lib/systemd-tusd.js";
import { deployUiBuild, hasValidDeployment } from "@/lib/deploy-ui.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";

/** Ensure ui/.env.local exists with required secrets */
function ensureEnvLocal(repoRoot: string): void {
  const envLocalPath = join(repoRoot, "ui", ".env.local");
  if (existsSync(envLocalPath)) return;

  const secret = randomBytes(32).toString("hex");
  const dbPath = join(repoRoot, "ui", "data", "local.db");
  const lines = [
    `BETTER_AUTH_SECRET=${secret}`,
    `BETTER_AUTH_URL=http://localhost:4180`,
    `DB_FILE_NAME=file:${dbPath}`,
  ];
  writeFileSync(envLocalPath, lines.join("\n") + "\n");
}

/** Ensure ui/data/ directory exists */
function ensureDataDir(repoRoot: string): void {
  const dataDir = join(repoRoot, "ui", "data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
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
    const repoRoot = getProjectRoot();
    const envConfig = await loadEnvConfig();
    const localIp = await getLocalIp();
    const uiUrl = getUiUrl(envConfig, localIp);
    setUrl(uiUrl);

    const running = await isUiServiceActive();
    if (running) {
      // Even if UI is running, ensure tusd is set up (handles upgrade)
      const tusdRunning = await isTusdServiceActive();
      if (!tusdRunning) {
        const tusdBin = join(repoRoot, "ui", ".tusd", "tusd");
        if (!existsSync(tusdBin)) {
          const sudoUser = process.env.SUDO_USER;
          const userOpts = sudoUser ? { user: sudoUser } : {};
          await shell("bun", ["run", join(repoRoot, "ui", "scripts", "download-tusd.ts")], {
            cwd: join(repoRoot, "ui"),
            ignoreError: true,
            ...userOpts,
          });
        }
        if (existsSync(join(repoRoot, "ui", ".tusd", "tusd"))) {
          try {
            const uploadDir = join(envConfig.BASE_DIR, "data/media/.uploads");
            mkdirSync(uploadDir, { recursive: true });
            await installTusdService(repoRoot, uploadDir);
            addStep("Start tusd service", "done");
            // Regenerate Caddyfile to include tusd route
            try { await regenerateCaddyfile(envConfig); } catch {}
          } catch {
            // Non-critical
          }
        }
      }

      setPhase("done");
      addStep("Already running", "done");
      const t = setTimeout(() => exit(), 100);
      t.unref();
      return;
    }

    // Ensure data dir and env file exist
    ensureDataDir(repoRoot);
    ensureEnvLocal(repoRoot);

    // Build and deploy the UI
    const uiDir = join(repoRoot, "ui");
    const hasStagedBuild = existsSync(join(uiDir, ".output", "server", "index.mjs"));

    if (!hasValidDeployment(uiDir) && !hasStagedBuild) {
      // No deployment and no staged build — need to build from scratch
      setPhase("building");
      const sudoUser = process.env.SUDO_USER;
      const userOpts = sudoUser ? { user: sudoUser } : {};
      const build = await shell("bun", ["run", "ui:build"], {
        cwd: repoRoot,
        ignoreError: true,
        ...userOpts,
      });
      if ((build.exitCode ?? 0) !== 0) {
        setError(`Build failed: ${build.stderr?.trim() || "unknown error"}`);
        return;
      }
      addStep("Build UI", "done");
    }

    // Deploy staged .output/ to blue-green slot, or bootstrap if first time
    try {
      if (existsSync(join(uiDir, ".output", "server", "index.mjs"))) {
        // Fresh build waiting to be deployed (manual bun run ui:build, or just built above)
        await deployUiBuild(uiDir);
        addStep("Deploy UI", "done");
      } else if (!hasValidDeployment(uiDir)) {
        // No .output and no deployment — shouldn't happen after build step, but guard anyway
        setError("Failed to set up deployment structure — no valid build found");
        return;
      }
    } catch (err: any) {
      setError(`Deployment failed: ${err.stderr?.trim() || err.message || "unknown error"}`);
      return;
    }

    // Download tusd binary if not present
    const tusdBin = join(repoRoot, "ui", ".tusd", "tusd");
    if (!existsSync(tusdBin)) {
      setPhase("building");
      const sudoUser = process.env.SUDO_USER;
      const userOpts = sudoUser ? { user: sudoUser } : {};
      const dl = await shell("bun", ["run", join(repoRoot, "ui", "scripts", "download-tusd.ts")], {
        cwd: join(repoRoot, "ui"),
        ignoreError: true,
        ...userOpts,
      });
      if ((dl.exitCode ?? 0) !== 0) {
        setError(`tusd download failed: ${dl.stderr?.trim() || "unknown error"}`);
        return;
      }
      addStep("Download tusd", "done");
    }

    setPhase("starting");

    // Install tusd service if not running
    const tusdRunning = await isTusdServiceActive();
    if (!tusdRunning) {
      try {
        const uploadDir = join(envConfig.BASE_DIR, "data/media/.uploads");
        mkdirSync(uploadDir, { recursive: true });
        await installTusdService(repoRoot, uploadDir);
      } catch (err: any) {
        setError(`Failed to start tusd: ${err.stderr?.trim() || err.message || "unknown error"}`);
        return;
      }
      addStep("Start tusd service", "done");
    }

    try {
      await installUiService(repoRoot);
    } catch (err: any) {
      setError(`Failed to start service: ${err.stderr?.trim() || err.message || "unknown error"}`);
      return;
    }
    addStep("Start UI service", "done");

    try {
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
          {" "}{phase === "building" ? "Building UI..." : phase === "starting" ? "Starting service..." : "Initializing..."}
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
    const uiRunning = await isUiServiceActive();
    const tusdRunning = await isTusdServiceActive();
    if (!uiRunning && !tusdRunning) {
      setInfo("UI is not running.");
      const t = setTimeout(() => exit(), 100);
      t.unref();
      return;
    }

    const envConfig = await loadEnvConfig();

    setPhase("stopping");
    if (uiRunning) {
      try {
        await shell("systemctl", ["stop", "mithrandir-ui"], { sudo: true });
      } catch (err: any) {
        setError(`Failed to stop service: ${err.stderr?.trim() || err.message || "unknown error"}`);
        return;
      }
    }

    if (tusdRunning) {
      await shell("systemctl", ["stop", "mithrandir-tusd"], { sudo: true, ignoreError: true });
    }

    try {
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
        <AppStatus name="Stop UI service" status="done" />
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
