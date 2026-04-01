import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage, TextInput, PasswordInput } from "@inkjs/ui";
import type { SecretDefinition, EnvConfig } from "@/types.js";
import { existsSync } from "fs";
import { getApp, getAppNames, getAppDir, getComposePath, getCompanionApps, getStack, getStackNames, APP_REGISTRY } from "@/lib/apps.js";
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
import { isRcloneInstalled, installRclone, ensureRcloneConfig } from "@/lib/rclone.js";
import {
  hasSystemd,
  isWsl,
  installSystemdUnits,
  isTimerActive,
} from "@/lib/systemd.js";
import { shell } from "@/lib/shell.js";
import { generateCompose } from "@/lib/compose.js";
import { generate404Page, generateCaddyfile, generateCaddyDockerfile, getDuckDnsDomain, regenerateCaddyfile } from "@/lib/caddy.js";
import { isUiServiceActive } from "@/lib/systemd-ui.js";
import { regenerateGatusConfig } from "@/lib/gatus.js";
import { getLocalIp } from "@/lib/distro.js";
import {
  isUfwInstalled,
  isUfwDockerInstalled,
  isUfwActive,
  installUfw,
  installUfwDocker,
  enableUfw,
  allowAppPorts,
  syncAllAppPorts,
} from "@/lib/ufw.js";
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
  const [rcloneAutoConfigured, setRcloneAutoConfigured] = useState(false);

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

    // ── auto-configure rclone from .env ──────────────────────────────────
    try {
      const env = await loadEnvConfig();
      const generated = await ensureRcloneConfig(env);
      if (generated) {
        setRcloneAutoConfigured(true);
        addStep({ name: "rclone config", status: "done", message: "Auto-configured from .env" });
      }
    } catch {
      // Non-fatal: user can configure manually
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
      const env = await loadEnvConfig();
      const backupHour = parseInt(env.BACKUP_HOUR ?? "2", 10);
      const hourStr = String(Math.max(0, Math.min(23, backupHour))).padStart(2, "0");
      const alreadyActive = await isTimerActive();
      if (alreadyActive) {
        addStep({ name: "Backup timer", status: "done", message: `Already active (daily at ${hourStr}:00)` });
      } else {
        try {
          await installSystemdUnits(backupHour);
          addStep({ name: "Backup timer", status: "done", message: `Installed (daily at ${hourStr}:00)` });
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
          {!rcloneAutoConfigured && (
            <Box flexDirection="column">
              <Text dimColor>  TIP: Set RCLONE_GDRIVE_APP_ID, RCLONE_GDRIVE_APP_SECRET, and RCLONE_GDRIVE_TOKEN in .env to auto-configure</Text>
              <Text dimColor>       Or run 'rclone config' manually. See: https://rclone.org/drive/#making-your-own-client-id</Text>
            </Box>
          )}
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
  const [piholeHandlesDns, setPiholeHandlesDns] = useState(false);
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
    await shell("mkdir", ["-p", `${caddyDir}/srv`], { sudo: true });

    const dockerfile = generateCaddyDockerfile();
    await Bun.write(`${caddyDir}/Dockerfile`, dockerfile);

    await shell("docker", ["build", "-t", "mithrandir/caddy-duckdns:latest", caddyDir], { sudo: true });
    addStep({ name: "Build image", status: "done", message: "Built Caddy with DuckDNS module" });

    // Generate Caddyfile from all currently installed apps
    const installedApps = APP_REGISTRY.filter((app) =>
      existsSync(getComposePath(app, baseDir)),
    );
    const includeDocs = await isContainerRunning("mithrandir-docs");
    const includeUi = await isUiServiceActive();
    const caddyfile = generateCaddyfile(installedApps, env, { includeDocs, includeUi });
    await Bun.write(`${caddyDir}/Caddyfile`, caddyfile);
    const notFoundPage = generate404Page(installedApps, env, { includeDocs, includeUi });
    await Bun.write(`${caddyDir}/srv/404.html`, notFoundPage);
    const proxyCount = installedApps.filter((a) => a.port && a.name !== "caddy").length;
    addStep({ name: "Caddyfile", status: "done", message: `${proxyCount} app${proxyCount !== 1 ? "s" : ""} configured` });

    // Generate compose and start Caddy
    setPhase("starting");
    const caddyApp = getApp("caddy")!;
    const compose = caddyApp.rawCompose!(env);
    const caddyComposePath = `${caddyDir}/docker-compose.yml`;
    await Bun.write(caddyComposePath, compose);
    await composeDown(caddyComposePath).catch(() => {});
    await composeUp(caddyComposePath);
    addStep({ name: "Caddy", status: "done", message: "Container started on port 443" });

    // Handle Pi-hole port conflicts + wildcard DNS
    const piholeDir = `${baseDir}/pihole`;
    const piholeComposePath = `${piholeDir}/docker-compose.yml`;
    if (existsSync(piholeComposePath)) {
      setPhase("pihole");
      const piholeApp = getApp("pihole")!;
      const piholeCompose = generateCompose(piholeApp, env);
      await Bun.write(piholeComposePath, piholeCompose);

      // Write wildcard DNS config so Pi-hole resolves *.domain to LAN IP
      const dnsmasqDir = `${piholeDir}/etc-dnsmasq.d`;
      await shell("mkdir", ["-p", dnsmasqDir], { sudo: true });
      await Bun.write(`${dnsmasqDir}/10-wildcard-domain.conf`, `address=/${derivedDomain}/${ip}\n`);

      await composeDown(piholeComposePath);
      await composeUp(piholeComposePath);
      addStep({ name: "Pi-hole", status: "done", message: `Restarted with wildcard DNS for *.${derivedDomain}` });
      setPiholeHandlesDns(true);
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
          {" "}Restarting Pi-hole with port and DNS changes...
        </Text>
      )}

      {phase === "done" && (
        <Box flexDirection="column" marginTop={1}>
          <StatusMessage variant="success">
            HTTPS is enabled via Caddy reverse proxy
          </StatusMessage>
          <Text dimColor>  Certificates are issued automatically via DNS-01 challenge.</Text>
          {piholeHandlesDns ? (
            <>
              <Text />
              <Text bold color="green">  DNS: Handled by Pi-hole</Text>
              <Text dimColor>  Wildcard DNS (*.{domain} → {lanIp}) configured automatically.</Text>
              <Text dimColor>  Devices using Pi-hole as DNS will resolve all app subdomains.</Text>
            </>
          ) : (
            <>
              <Text />
              <Text bold color="yellow">  DNS setup required:</Text>
              <Text>  DuckDNS only resolves {domain} — not *.{domain} subdomains.</Text>
              <Text>  Add a wildcard DNS entry on your router pointing to this server:</Text>
              <Text />
              <Text>    *.{domain}  →  {lanIp}</Text>
              <Text />
              <Text dimColor>  How to do this depends on your router. Common options:</Text>
              <Text dimColor>    - Router admin DNS/hosts override (e.g. OpenWrt, pfSense, UniFi)</Text>
              <Text dimColor>    - Per-device /etc/hosts (no wildcard support — must list each app)</Text>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Install Firewall (UFW + ufw-docker) ─────────────────────────────────────

function InstallFirewall() {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<
    "checking" | "installing-ufw" | "installing-ufw-docker" | "enabling" | "rules" | "done"
  >("checking");
  const [error, setError] = useState<string | null>(null);

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    run();
  }, []);

  async function run() {
    // Check if UFW is already installed
    const ufwInstalled = await isUfwInstalled();
    if (ufwInstalled) {
      addStep({ name: "UFW", status: "done", message: "Already installed" });
    } else {
      setPhase("installing-ufw");
      try {
        await installUfw();
        addStep({ name: "UFW", status: "done", message: "Installed" });
      } catch (err: any) {
        setError(`UFW install failed: ${err.message}`);
        return;
      }
    }

    // Check if ufw-docker is already installed
    const ufwDockerInstalled = await isUfwDockerInstalled();
    if (ufwDockerInstalled) {
      addStep({ name: "ufw-docker", status: "done", message: "Already installed" });
    } else {
      setPhase("installing-ufw-docker");
      try {
        await installUfwDocker();
        addStep({ name: "ufw-docker", status: "done", message: "Installed" });
      } catch (err: any) {
        setError(`ufw-docker install failed: ${err.message}`);
        return;
      }
    }

    // Enable UFW if not already active
    setPhase("enabling");
    const active = await isUfwActive();
    if (active) {
      addStep({ name: "Enable UFW", status: "done", message: "Already active" });
    } else {
      try {
        await enableUfw();
        addStep({ name: "Enable UFW", status: "done", message: "Enabled (default deny incoming, SSH allowed)" });
      } catch (err: any) {
        setError(`Failed to enable UFW: ${err.message}`);
        return;
      }
    }

    // Add rules for all currently installed apps
    setPhase("rules");
    try {
      const env = await loadEnvConfig();
      const installedApps = APP_REGISTRY.filter((app) =>
        existsSync(getComposePath(app, env.BASE_DIR)),
      );
      if (installedApps.length > 0) {
        await syncAllAppPorts(installedApps);
        addStep({
          name: "Firewall rules",
          status: "done",
          message: `Added rules for ${installedApps.length} installed app(s)`,
        });
      } else {
        addStep({ name: "Firewall rules", status: "skipped", message: "No apps installed yet" });
      }
    } catch {
      addStep({ name: "Firewall rules", status: "skipped", message: "Failed to sync rules (non-fatal)" });
    }

    // Save ENABLE_FIREWALL to .env
    try {
      const env = await loadEnvConfig();
      env.ENABLE_FIREWALL = "true";
      await saveEnvConfig(env);
    } catch {
      // Non-fatal
    }

    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Install: firewall" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Install: firewall" />

      <Box marginBottom={1} flexDirection="column">
        <Text dimColor>  Configures UFW firewall with ufw-docker to control access to</Text>
        <Text dimColor>  container ports. SSH (port 22) is always allowed.</Text>
      </Box>

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
          {" "}Checking firewall status...
        </Text>
      )}
      {phase === "installing-ufw" && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text>
          {" "}Installing UFW...
        </Text>
      )}
      {phase === "installing-ufw-docker" && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text>
          {" "}Installing ufw-docker...
        </Text>
      )}
      {phase === "enabling" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Enabling UFW...
        </Text>
      )}
      {phase === "rules" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Configuring firewall rules for installed apps...
        </Text>
      )}

      {phase === "done" && (
        <Box flexDirection="column" marginTop={1}>
          <StatusMessage variant="success">
            Firewall is enabled and configured
          </StatusMessage>
          <Text dimColor>  UFW rules are automatically managed when you install or uninstall apps.</Text>
          <Text dimColor>  View current rules: sudo ufw status</Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Install App ─────────────────────────────────────────────────────────────

function InstallApp({ appName }: { appName: string }) {
  const { exit } = useApp();
  const [appResults, setAppResults] = useState<
    Array<{ name: string; status: "done" | "error" | "skipped"; message?: string }>
  >([]);
  const [phase, setPhase] = useState<"init" | "secrets" | "pulling" | "composing" | "caddy" | "gatus" | "done">("init");
  const [currentAppName, setCurrentAppName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [missingSecrets, setMissingSecrets] = useState<SecretDefinition[]>([]);
  const [secretIdx, setSecretIdx] = useState(0);
  const [envRef, setEnvRef] = useState<EnvConfig | null>(null);
  const [secretResolver, setSecretResolver] = useState<{ resolve: () => void } | null>(null);

  useEffect(() => {
    run();
  }, []);

  function handleSecretSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const secret = missingSecrets[secretIdx];
    envRef![secret.envVar] = trimmed;

    if (secretIdx + 1 < missingSecrets.length) {
      setSecretIdx(secretIdx + 1);
    } else {
      secretResolver?.resolve();
    }
  }

  async function run() {
    const app = getApp(appName);
    if (!app) {
      setError(`Unknown app: ${appName}\nValid apps: ${getAppNames().join(", ")}`);
      return;
    }

    const env = await loadEnvConfig();
    setEnvRef(env);
    const composePath = getComposePath(app, env.BASE_DIR);

    if (existsSync(composePath)) {
      setError(`App '${appName}' is already installed. Use 'mithrandir reinstall ${appName}' to reinstall.`);
      return;
    }

    // Check HTTPS prerequisite
    if (app.requiresHttps && env.ENABLE_HTTPS !== "true") {
      setError(`${app.displayName} requires HTTPS.\nInstall it first: mithrandir install https`);
      return;
    }

    // Auto-generate secrets if needed
    if (app.secrets) {
      let envChanged = false;
      for (const secret of app.secrets) {
        if (secret.generate && !env[secret.envVar]) {
          try {
            const parts = secret.generate.split(/\s+/);
            const result = await shell(parts[0], parts.slice(1), { ignoreError: true });
            const value = result.stdout.trim();
            if (value) {
              env[secret.envVar] = value;
              envChanged = true;
            }
          } catch {
            // Non-fatal — user can set manually
          }
        }
      }
      if (envChanged) {
        await saveEnvConfig(env);
      }

      // Prompt for missing required secrets
      const missing = app.secrets.filter(
        (s) => s.required && !s.generate && !env[s.envVar],
      );
      if (missing.length > 0) {
        setMissingSecrets(missing);
        setSecretIdx(0);
        setPhase("secrets");
        await new Promise<void>((resolve) => {
          setSecretResolver({ resolve });
        });
        await saveEnvConfig(env);
      }
    }

    // Build list of apps to install (main + companions)
    const appsToInstall = [app];
    const companions = getCompanionApps(appName);
    for (const companion of companions) {
      const companionCompose = getComposePath(companion, env.BASE_DIR);
      if (existsSync(companionCompose)) {
        setAppResults((prev) => [...prev, { name: companion.displayName, status: "done", message: "Already installed" }]);
      } else {
        appsToInstall.push(companion);
      }
    }

    const results: Array<{ name: string; status: "done" | "error" | "skipped"; message?: string }> = [];

    // Install each app
    for (const installApp of appsToInstall) {
      setCurrentAppName(installApp.displayName);
      setPhase("pulling");
      setPullProgress(0);
      await pullImageWithProgress(installApp.image, (pct) => setPullProgress(pct));

      setPhase("composing");
      await writeComposeAndStart(installApp, env);
      results.push({ name: installApp.displayName, status: "done" });
      setAppResults((prev) => [...prev, { name: installApp.displayName, status: "done" }]);
    }

    // Regenerate Caddyfile if HTTPS is enabled
    if (env.ENABLE_HTTPS === "true") {
      setPhase("caddy");
      setCurrentAppName("HTTPS");
      try {
        await regenerateCaddyfile(env);
        setAppResults((prev) => [...prev, { name: "HTTPS", status: "done", message: "Caddyfile updated" }]);
      } catch {
        setAppResults((prev) => [...prev, { name: "HTTPS", status: "skipped", message: "Failed to update Caddyfile" }]);
      }

      // When Pi-hole is being installed with HTTPS active, write wildcard DNS config
      if (appName === "pihole") {
        const domain = getDuckDnsDomain(env);
        if (domain) {
          const ip = await getLocalIp();
          const dnsmasqDir = `${env.BASE_DIR}/pihole/etc-dnsmasq.d`;
          await shell("mkdir", ["-p", dnsmasqDir], { sudo: true });
          await Bun.write(`${dnsmasqDir}/10-wildcard-domain.conf`, `address=/${domain}/${ip}\n`);
          setAppResults((prev) => [...prev, { name: "DNS", status: "done", message: `Wildcard *.${domain} → ${ip}` }]);
        }
      }
    }

    // Add UFW rules if firewall is enabled
    if (env.ENABLE_FIREWALL === "true" && await isUfwActive()) {
      try {
        for (const installApp of appsToInstall) {
          await allowAppPorts(installApp);
        }
        setAppResults((prev) => [...prev, { name: "Firewall", status: "done", message: "UFW rules added" }]);
      } catch {
        setAppResults((prev) => [...prev, { name: "Firewall", status: "skipped", message: "Failed to add UFW rules" }]);
      }
    }

    // Regenerate Gatus config if Gatus is installed (and we're not installing Gatus itself)
    if (appName !== "gatus") {
      setPhase("gatus");
      setCurrentAppName("Gatus");
      try {
        await regenerateGatusConfig(env);
        setAppResults((prev) => [...prev, { name: "Gatus", status: "done", message: "Health checks updated" }]);
      } catch {
        // Non-fatal: Gatus may not be installed
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

      {appResults.map((r, i) => (
        <AppStatus
          key={i}
          name={r.name}
          status={r.status}
          message={r.message}
        />
      ))}

      {phase === "secrets" && missingSecrets.length > 0 && (
        <Box flexDirection="column">
          <Text>
            <Text bold>{missingSecrets[secretIdx].prompt}</Text>:
          </Text>
          <Box>
            <Text color="blue">{">"} </Text>
            {missingSecrets[secretIdx].sensitive ? (
              <PasswordInput
                key={`secret-${secretIdx}`}
                onSubmit={handleSecretSubmit}
              />
            ) : (
              <TextInput
                key={`secret-${secretIdx}`}
                onSubmit={handleSecretSubmit}
              />
            )}
          </Box>
          {missingSecrets.length > 1 && (
            <Text dimColor>({secretIdx + 1}/{missingSecrets.length})</Text>
          )}
        </Box>
      )}

      {phase !== "done" && phase !== "secrets" && (
        <Box flexDirection="column">
          <Text>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            {" "}{currentAppName}
            {phase === "pulling" && " — pulling image..."}
            {phase === "composing" && " — starting container..."}
            {phase === "caddy" && " — updating HTTPS..."}
            {phase === "gatus" && " — updating health checks..."}
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

// ─── Install Stack ──────────────────────────────────────────────────────────

function InstallStack({ stackName }: { stackName: string }) {
  const { exit } = useApp();
  const [appResults, setAppResults] = useState<
    Array<{ name: string; status: "done" | "error" | "skipped"; message?: string }>
  >([]);
  const [phase, setPhase] = useState<"init" | "pulling" | "composing" | "caddy" | "done">("init");
  const [currentAppName, setCurrentAppName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [installIdx, setInstallIdx] = useState(0);
  const [totalApps, setTotalApps] = useState(0);

  const stack = getStack(stackName)!;

  useEffect(() => {
    run();
  }, []);

  async function run() {
    const env = await loadEnvConfig();

    // Resolve all apps in the stack, including companions
    const appNames = new Set<string>();
    for (const name of stack.apps) {
      appNames.add(name);
      for (const companion of getCompanionApps(name)) {
        appNames.add(companion.name);
      }
    }

    // Filter out caddy (installed via `install https`) and already-installed apps
    const appsToInstall: Array<{ app: NonNullable<ReturnType<typeof getApp>> }> = [];
    for (const name of appNames) {
      if (name === "caddy") {
        setAppResults((prev) => [...prev, { name: "Caddy", status: "skipped", message: "Install separately via: mithrandir install https" }]);
        continue;
      }
      const app = getApp(name);
      if (!app) continue;

      const composePath = getComposePath(app, env.BASE_DIR);
      if (existsSync(composePath)) {
        setAppResults((prev) => [...prev, { name: app.displayName, status: "done", message: "Already installed" }]);
        continue;
      }

      if (app.requiresHttps && env.ENABLE_HTTPS !== "true") {
        setAppResults((prev) => [...prev, { name: app.displayName, status: "skipped", message: "Requires HTTPS (run: mithrandir install https)" }]);
        continue;
      }

      appsToInstall.push({ app });
    }

    if (appsToInstall.length === 0) {
      setPhase("done");
      setTimeout(() => exit(), 500);
      return;
    }

    setTotalApps(appsToInstall.length);

    // Install each app
    for (let i = 0; i < appsToInstall.length; i++) {
      const { app } = appsToInstall[i];
      setInstallIdx(i);
      setCurrentAppName(app.displayName);
      setPhase("pulling");
      setPullProgress(0);
      await pullImageWithProgress(app.image, (pct) => setPullProgress(pct));

      setPhase("composing");
      await writeComposeAndStart(app, env);
      setAppResults((prev) => [...prev, { name: app.displayName, status: "done" }]);
    }

    // Regenerate Caddyfile if HTTPS is enabled
    if (env.ENABLE_HTTPS === "true") {
      setPhase("caddy");
      setCurrentAppName("HTTPS");
      try {
        await regenerateCaddyfile(env);
        setAppResults((prev) => [...prev, { name: "HTTPS", status: "done", message: "Caddyfile updated" }]);
      } catch {
        setAppResults((prev) => [...prev, { name: "HTTPS", status: "skipped", message: "Failed to update Caddyfile" }]);
      }
    }

    // Add UFW rules if firewall is enabled
    if (env.ENABLE_FIREWALL === "true" && await isUfwActive()) {
      try {
        for (const { app } of appsToInstall) {
          await allowAppPorts(app);
        }
        setAppResults((prev) => [...prev, { name: "Firewall", status: "done", message: "UFW rules added" }]);
      } catch {
        setAppResults((prev) => [...prev, { name: "Firewall", status: "skipped", message: "Failed to add UFW rules" }]);
      }
    }

    // Regenerate Gatus config if Gatus is installed
    setPhase("caddy");
    setCurrentAppName("Gatus");
    try {
      await regenerateGatusConfig(env);
      setAppResults((prev) => [...prev, { name: "Gatus", status: "done", message: "Health checks updated" }]);
    } catch {
      // Non-fatal: Gatus may not be installed
    }

    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title={`Install stack: ${stack.label}`} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title={`Install stack: ${stack.label} (${installIdx + 1}/${totalApps})`} />
      <Text dimColor>  {stack.description}</Text>
      <Box marginTop={1} flexDirection="column">
        {appResults.map((r, i) => (
          <AppStatus
            key={i}
            name={r.name}
            status={r.status}
            message={r.message}
          />
        ))}

        {phase !== "done" && (
          <Box flexDirection="column">
            <Text>
              <Text color="yellow">
                <Spinner type="dots" />
              </Text>
              {" "}{currentAppName}
              {phase === "pulling" && " — pulling image..."}
              {phase === "composing" && " — starting container..."}
              {phase === "caddy" && " — updating HTTPS..."}
            </Text>
            {phase === "pulling" && pullProgress > 0 && pullProgress < 100 && (
              <ProgressBar percent={pullProgress} />
            )}
          </Box>
        )}

        {phase === "done" && (
          <Box marginTop={1}>
            <StatusMessage variant="success">
              Stack '{stack.label}' install complete
            </StatusMessage>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const SPECIAL_TARGETS = ["docker", "backup", "https", "firewall"];

export async function runInstall(args: string[]): Promise<void> {
  const target = args[0];
  const stackNames = getStackNames();

  if (!target) {
    console.error(
      `Usage: mithrandir install <target>\n\nTargets:\n  docker                Install Docker engine\n  backup                Install rclone and backup systemd timer\n  https                 Install Caddy HTTPS reverse proxy\n  firewall              Install UFW firewall with ufw-docker\n  <stack>               Install a predefined app stack\n  <app>                 Install a single app\n\nStacks: ${stackNames.join(", ")}\n\nAvailable apps: ${getAppNames().join(", ")}`,
    );
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
  } else if (target === "firewall") {
    const { waitUntilExit } = render(<InstallFirewall />);
    await waitUntilExit();
  } else if (target === "caddy") {
    console.error("Caddy is installed via: mithrandir install https");
    process.exit(1);
  } else if (getStack(target)) {
    const { waitUntilExit } = render(<InstallStack stackName={target} />);
    await waitUntilExit();
  } else {
    const { waitUntilExit } = render(<InstallApp appName={target} />);
    await waitUntilExit();
  }
}
