import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage, TextInput } from "@inkjs/ui";
import { existsSync } from "fs";
import { getApp, getAppNames, getAppDir, getComposePath, APP_REGISTRY } from "@/lib/apps.js";
import { loadEnvConfig, saveEnvConfig } from "@/lib/config.js";
import {
  isDockerInstalled,
  waitForDocker,
  installDocker,
  isContainerRunning,
  pullImageWithProgress,
  composeDown,
  composeUp,
} from "@/lib/docker.js";
import { getSwapInfo, ensureSwap, formatSwapSize } from "@/lib/swap.js";
import { isRcloneInstalled, installRclone } from "@/lib/rclone.js";
import {
  hasSystemd,
  isWsl,
  installSystemdUnits,
  isTimerActive,
} from "@/lib/systemd.js";
import { shell } from "@/lib/shell.js";
import { generateCompose } from "@/lib/compose.js";
import { generateCaddyfile, generateCaddyDockerfile, getDuckDnsDomain, regenerateCaddyfile } from "@/lib/caddy.js";
import { getLocalIp } from "@/lib/distro.js";
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

// ─── Install HTTPS (Caddy reverse proxy) ─────────────────────────────────────

function InstallHttps() {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<
    "checking" | "prompt-email" | "building" | "starting" | "pihole" | "done"
  >("checking");
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [lanIp, setLanIp] = useState("");
  const [envConfig, setEnvConfig] = useState<Awaited<ReturnType<typeof loadEnvConfig>> | null>(null);

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    checkPrerequisites();
  }, []);

  async function checkPrerequisites() {
    const env = await loadEnvConfig();
    setEnvConfig(env);

    // Check DuckDNS secrets exist in .env
    if (!env.DUCKDNS_TOKEN || !env.DUCKDNS_SUBDOMAINS) {
      setError(
        "DuckDNS is not configured.\nInstall the DuckDNS app first: mithrandir install duckdns",
      );
      return;
    }

    // Check DuckDNS container is actually installed and running
    const duckdnsCompose = getComposePath(getApp("duckdns")!, env.BASE_DIR);
    if (!existsSync(duckdnsCompose)) {
      setError(
        "DuckDNS app is not installed.\nHTTPS requires DuckDNS for DNS-01 certificate validation.\nInstall it first: mithrandir install duckdns",
      );
      return;
    }

    const duckdnsRunning = await isContainerRunning("duckdns");
    if (!duckdnsRunning) {
      setError(
        "DuckDNS container is not running.\nStart it first: mithrandir start duckdns",
      );
      return;
    }

    // Derive and validate domain
    const derivedDomain = getDuckDnsDomain(env);
    if (!derivedDomain) {
      setError("Could not derive domain from DUCKDNS_SUBDOMAINS.");
      return;
    }
    setDomain(derivedDomain);
    addStep({ name: "DuckDNS", status: "done", message: `Domain: ${derivedDomain}` });

    // Check if already enabled
    if (env.ENABLE_HTTPS === "true") {
      const caddyCompose = getComposePath(getApp("caddy")!, env.BASE_DIR);
      if (existsSync(caddyCompose)) {
        setError(
          "HTTPS is already enabled.\nTo reconfigure, run: mithrandir reinstall caddy",
        );
        return;
      }
    }

    // Prompt for email (always prompt even if set, so user can verify)
    setPhase("prompt-email");
  }

  async function handleEmailSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || !trimmed.includes("@")) return;
    await doInstall(envConfig!, trimmed);
  }

  async function doInstall(env: Awaited<ReturnType<typeof loadEnvConfig>>, acmeEmail: string) {
    const derivedDomain = getDuckDnsDomain(env)!;

    // Save to .env
    env.ENABLE_HTTPS = "true";
    env.ACME_EMAIL = acmeEmail;
    await saveEnvConfig(env);
    addStep({ name: "Config", status: "done", message: `Email: ${acmeEmail}` });

    // Detect LAN IP for DNS instructions
    const ip = await getLocalIp();
    setLanIp(ip);

    // Build custom Caddy image with DuckDNS DNS module
    setPhase("building");
    const baseDir = env.BASE_DIR;
    const caddyDir = `${baseDir}/caddy`;
    await shell("mkdir", ["-p", caddyDir], { sudo: true });
    await shell("mkdir", ["-p", `${caddyDir}/config`], { sudo: true });
    await shell("mkdir", ["-p", `${caddyDir}/data`], { sudo: true });

    const dockerfile = generateCaddyDockerfile();
    await Bun.write(`${caddyDir}/Dockerfile`, dockerfile);

    await shell("docker", ["build", "-t", "mithrandir/caddy-duckdns:latest", caddyDir], { sudo: true });
    addStep({ name: "Build image", status: "done", message: "Built Caddy with DuckDNS module" });

    // Generate Caddyfile from all currently installed apps
    const installedApps = APP_REGISTRY.filter((app) =>
      existsSync(getComposePath(app, baseDir)),
    );
    const caddyfile = generateCaddyfile(installedApps, env);
    await Bun.write(`${caddyDir}/Caddyfile`, caddyfile);
    const proxyCount = installedApps.filter((a) => a.port && a.name !== "caddy").length;
    addStep({ name: "Caddyfile", status: "done", message: `${proxyCount} app${proxyCount !== 1 ? "s" : ""} configured` });

    // Generate compose and start Caddy
    setPhase("starting");
    const caddyApp = getApp("caddy")!;
    const compose = caddyApp.rawCompose!(env);
    const caddyComposePath = `${caddyDir}/docker-compose.yml`;
    await Bun.write(caddyComposePath, compose);
    await composeUp(caddyComposePath);
    addStep({ name: "Caddy", status: "done", message: "Container started on port 443" });

    // Handle Pi-hole port 443 conflict
    const piholeDir = `${baseDir}/pihole`;
    const piholeComposePath = `${piholeDir}/docker-compose.yml`;
    if (existsSync(piholeComposePath)) {
      setPhase("pihole");
      const piholeApp = getApp("pihole")!;
      const piholeCompose = generateCompose(piholeApp, env);
      await Bun.write(piholeComposePath, piholeCompose);
      await composeDown(piholeComposePath);
      await composeUp(piholeComposePath);
      addStep({ name: "Pi-hole", status: "done", message: "Restarted without port 443" });
    }

    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Install: https" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Install: https" />

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
          {" "}Checking prerequisites...
        </Text>
      )}

      {phase === "prompt-email" && (
        <Box flexDirection="column">
          <Text bold>ACME Email</Text>
          <Text dimColor>  Let's Encrypt requires an email to issue TLS certificates.</Text>
          <Text dimColor>  Used for expiry warnings and account recovery — not shared publicly.</Text>
          <Box marginTop={1}>
            <Text color="cyan">{"  Email: "}</Text>
            <TextInput defaultValue={envConfig?.ACME_EMAIL ?? ""} onSubmit={handleEmailSubmit} />
          </Box>
        </Box>
      )}

      {phase === "building" && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text>
          {" "}Building Caddy image with DuckDNS module (this may take a minute)...
        </Text>
      )}

      {phase === "starting" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Starting Caddy container...
        </Text>
      )}

      {phase === "pihole" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Restarting Pi-hole without port 443...
        </Text>
      )}

      {phase === "done" && (
        <Box flexDirection="column" marginTop={1}>
          <StatusMessage variant="success">
            HTTPS is enabled via Caddy reverse proxy
          </StatusMessage>
          <Text dimColor>  Certificates are issued automatically via DNS-01 challenge.</Text>
          <Text />
          <Text bold color="yellow">  DNS setup required:</Text>
          <Text>  DuckDNS only resolves {domain} — not *.{domain} subdomains.</Text>
          <Text>  Add a wildcard DNS entry on your router pointing to this server:</Text>
          <Text />
          <Text>    *.{domain}  →  {lanIp}</Text>
          <Text />
          <Text dimColor>  How to do this depends on your router. Common options:</Text>
          <Text dimColor>    - Router admin DNS/hosts override (e.g. OpenWrt, pfSense, UniFi)</Text>
          <Text dimColor>    - Pi-hole local DNS: add address=/{domain}/{lanIp} to /etc/dnsmasq.d/</Text>
          <Text dimColor>    - Per-device /etc/hosts (no wildcard support — must list each app)</Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Install App ─────────────────────────────────────────────────────────────

function InstallApp({ appName }: { appName: string }) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<"init" | "pulling" | "installing" | "caddy" | "done">("init");
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

    // Regenerate Caddyfile if HTTPS is enabled
    if (env.ENABLE_HTTPS === "true") {
      setPhase("caddy");
      setCurrentLabel("Updating HTTPS configuration...");
      try {
        await regenerateCaddyfile(env);
        addStep({ name: "HTTPS", status: "done", message: "Caddyfile updated" });
      } catch {
        addStep({ name: "HTTPS", status: "skipped", message: "Failed to update Caddyfile" });
      }
    }

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

      {(phase === "init" || phase === "pulling" || phase === "installing" || phase === "caddy") && (
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

const SPECIAL_TARGETS = ["docker", "backup", "https"];

export async function runInstall(args: string[]): Promise<void> {
  const target = args[0];

  if (!target) {
    console.error(
      `Usage: mithrandir install <target>\n\nTargets:\n  docker                Install Docker engine\n  backup                Install rclone and backup systemd timer\n  https                 Install Caddy HTTPS reverse proxy\n  <app>                 Install a single app\n\nAvailable apps: ${getAppNames().join(", ")}`,
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
  } else if (target === "https") {
    const { waitUntilExit } = render(<InstallHttps />);
    await waitUntilExit();
  } else {
    const { waitUntilExit } = render(<InstallApp appName={target} />);
    await waitUntilExit();
  }
}
