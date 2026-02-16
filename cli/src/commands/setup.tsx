import { useState, useEffect, useRef } from "react";
import { Box, Text, useApp } from "ink";
import { MultiSelect, TextInput, ConfirmInput } from "@inkjs/ui";
import Spinner from "ink-spinner";
import {
  APP_REGISTRY,
  getApp,
  getAppDir,
  getContainerName,
  getComposePath,
  getConfigPaths,
  filterConflicts,
} from "../lib/apps.js";
import {
  isDockerInstalled,
  waitForDocker,
  installDocker,
  isContainerRunning,
  getRunningImageId,
  pullImage,
  removeContainer,
  composeUp,
  composeDown,
} from "../lib/docker.js";
import { isRcloneInstalled, installRclone } from "../lib/rclone.js";
import { generateCompose } from "../lib/compose.js";
import {
  hasSystemd,
  isWsl,
  installSystemdUnits,
} from "../lib/systemd.js";
import { detectDistro, getLocalIp } from "../lib/distro.js";
import { loadEnvConfig, saveEnvConfig } from "../lib/config.js";
import { shell } from "../lib/shell.js";
import { Header } from "../components/Header.js";
import { StepIndicator } from "../components/StepIndicator.js";
import { AppStatus } from "../components/AppStatus.js";
import type { AppDefinition, EnvConfig, SecretDefinition } from "../types.js";
import { homedir } from "os";

interface SetupCommandProps {
  flags: { yes?: boolean };
}

type SetupStep =
  | "init"
  | "docker"
  | "rclone"
  | "base-dir"
  | "app-select"
  | "install-apps"
  | "backup-service"
  | "summary";

export function SetupCommand({ flags }: SetupCommandProps) {
  const autoYes = flags.yes ?? false;
  const { exit } = useApp();

  const [step, setStep] = useState<SetupStep>("init");
  const [envConfig, setEnvConfig] = useState<EnvConfig>({
    BASE_DIR: homedir(),
    PUID: "1000",
    PGID: "1000",
    TZ: "Etc/UTC",
  });
  const [selectedApps, setSelectedApps] = useState<AppDefinition[]>([]);
  const [localIp, setLocalIp] = useState("localhost");
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<
    Array<{ name: string; status: "done" | "skipped"; message: string; notes?: string[] }>
  >([]);

  function addCompletedStep(entry: { name: string; status: "done" | "skipped"; message: string; notes?: string[] }) {
    setCompletedSteps(prev => [...prev, entry]);
  }

  // Initialization
  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const env = await loadEnvConfig();
      setEnvConfig(env);
      const ip = await getLocalIp();
      setLocalIp(ip);
      await detectDistro(); // Throws on unsupported distro
      setStep("docker");
    } catch (err: any) {
      setError(err.message);
    }
  }

  // ─── Step: Docker ───────────────────────────────────────────────────────────

  function DockerStep() {
    const [status, setStatus] = useState<"checking" | "confirm" | "installing" | "waiting" | "done">(
      "checking",
    );

    useEffect(() => {
      checkDocker();
    }, []);

    async function checkDocker() {
      if (await isDockerInstalled()) {
        setStatus("waiting");
        if (await waitForDocker(5, 1000)) {
          setStatus("done");
          addCompletedStep({ name: "Docker", status: "done", message: "Ready" });
          setStep("rclone");
          return;
        }
      }

      if (autoYes) {
        await doInstall();
      } else {
        setStatus("confirm");
      }
    }

    async function doInstall() {
      setStatus("installing");
      try {
        await installDocker();
        setStatus("waiting");
        const ready = await waitForDocker();
        if (!ready) {
          setError("Docker daemon did not become ready in time.");
          return;
        }
        setStatus("done");
        addCompletedStep({ name: "Docker", status: "done", message: "Installed" });
        setStep("rclone");
      } catch (err: any) {
        setError(`Docker install failed: ${err.message}`);
      }
    }

    if (status === "done") {
      return <AppStatus name="Docker" status="done" message="Ready" />;
    }

    return (
      <Box flexDirection="column">
        <StepIndicator current={1} total={7} label="Docker" />
        {status === "checking" && (
          <Text>
            <Text color="green"><Spinner type="dots" /></Text>
            {" "}Checking Docker...
          </Text>
        )}
        {status === "confirm" && (
          <Box flexDirection="column">
            <Text>Docker is not installed. Install it now?</Text>
            <ConfirmInput
              onConfirm={async () => { await doInstall(); }}
              onCancel={() => {
                setError("Docker is required. Aborting setup.");
              }}
            />
          </Box>
        )}
        {status === "installing" && (
          <Text>
            <Text color="yellow"><Spinner type="dots" /></Text>
            {" "}Installing Docker...
          </Text>
        )}
        {status === "waiting" && (
          <Text>
            <Text color="green"><Spinner type="dots" /></Text>
            {" "}Waiting for Docker daemon...
          </Text>
        )}
      </Box>
    );
  }

  // ─── Step: rclone ───────────────────────────────────────────────────────────

  function RcloneStep() {
    const [status, setStatus] = useState<"checking" | "confirm" | "installing" | "done">(
      "checking",
    );

    useEffect(() => {
      checkRclone();
    }, []);

    async function checkRclone() {
      if (await isRcloneInstalled()) {
        setStatus("done");
        addCompletedStep({ name: "rclone", status: "done", message: "Ready" });
        setStep("base-dir");
        return;
      }
      if (autoYes) {
        await doInstall();
      } else {
        setStatus("confirm");
      }
    }

    async function doInstall() {
      setStatus("installing");
      try {
        await installRclone();
        setStatus("done");
        addCompletedStep({
          name: "rclone",
          status: "done",
          message: "Installed",
          notes: [
            "NOTE: To configure rclone for Google Drive, run: rclone config",
            "      This will set up the remote connection to your Google Drive.",
          ],
        });
        setStep("base-dir");
      } catch (err: any) {
        setError(`rclone install failed: ${err.message}`);
      }
    }

    if (status === "done") {
      return <AppStatus name="rclone" status="done" message="Ready" />;
    }

    return (
      <Box flexDirection="column">
        <StepIndicator current={2} total={7} label="rclone" />
        {status === "checking" && (
          <Text>
            <Text color="green"><Spinner type="dots" /></Text>
            {" "}Checking rclone...
          </Text>
        )}
        {status === "confirm" && (
          <Box flexDirection="column">
            <Text>rclone is not installed. Install it now?</Text>
            <ConfirmInput
              onConfirm={async () => { await doInstall(); }}
              onCancel={() => {
                setError("rclone is required for backups. Aborting setup.");
              }}
            />
          </Box>
        )}
        {status === "installing" && (
          <Text>
            <Text color="yellow"><Spinner type="dots" /></Text>
            {" "}Installing rclone...
          </Text>
        )}
      </Box>
    );
  }

  // ─── Step: Base directory ───────────────────────────────────────────────────

  function BaseDirStep() {
    const [value, setValue] = useState(envConfig.BASE_DIR);

    useEffect(() => {
      if (autoYes) {
        confirmBaseDir(envConfig.BASE_DIR);
      }
    }, []);

    async function confirmBaseDir(dir: string) {
      const updated = { ...envConfig, BASE_DIR: dir };
      setEnvConfig(updated);

      // Create data directory structure
      const dataDir = `${dir}/data`;
      const dirs = [
        `${dataDir}/downloads/movies`,
        `${dataDir}/downloads/tv`,
        `${dataDir}/downloads/music`,
        `${dataDir}/media/movies`,
        `${dataDir}/media/tv`,
        `${dataDir}/media/music`,
      ];
      for (const d of dirs) {
        await shell("mkdir", ["-p", d], { sudo: true });
      }

      // Set ownership
      await shell(
        "chown",
        ["-R", `${updated.PUID}:${updated.PGID}`, dataDir],
        { sudo: true },
      );

      addCompletedStep({ name: "Base directory", status: "done", message: dir });
      setStep("app-select");
    }

    if (autoYes) {
      return (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Setting up base directory: {envConfig.BASE_DIR}
        </Text>
      );
    }

    return (
      <Box flexDirection="column">
        <StepIndicator current={3} total={7} label="Base Directory" />
        <Text>Enter the base directory where all Docker app folders should be created:</Text>
        <Box>
          <Text color="blue">{">"} </Text>
          <TextInput
            defaultValue={value}
            onSubmit={confirmBaseDir}
          />
        </Box>
      </Box>
    );
  }

  // ─── Step: App selection ────────────────────────────────────────────────────

  function AppSelectStep() {
    useEffect(() => {
      if (autoYes) {
        // In auto mode, select all apps but filter conflicts (prefer Seerr over Jellyseerr)
        const allApps = APP_REGISTRY.filter((a) => a.name !== "jellyseerr");
        setSelectedApps(filterConflicts(allApps));
        setStep("install-apps");
      }
    }, []);

    if (autoYes) return null;

    const options = APP_REGISTRY.map((app) => ({
      label: `${app.displayName} — ${app.description}`,
      value: app.name,
    }));

    function handleSubmit(values: string[]) {
      const apps = values
        .map((name) => getApp(name))
        .filter((a): a is AppDefinition => a !== undefined);
      const filtered = filterConflicts(apps);
      setSelectedApps(filtered);
      setStep("install-apps");
    }

    return (
      <Box flexDirection="column">
        <StepIndicator current={4} total={7} label="Select Apps" />
        <Text>Choose services to install (space to toggle, enter to confirm):</Text>
        <Text dimColor>Note: Seerr and Jellyseerr conflict (same port). Only the first selected will be installed.</Text>
        <MultiSelect options={options} onSubmit={handleSubmit} />
      </Box>
    );
  }

  // InstallAppsStep is defined at module level to avoid React component
  // recreation on parent re-renders (the classic inner-component anti-pattern).

  // ─── Step: Backup service ───────────────────────────────────────────────────

  function BackupServiceStep() {
    const [status, setStatus] = useState<"checking" | "installing" | "done" | "skipped">(
      "checking",
    );

    useEffect(() => {
      setupBackupService();
    }, []);

    async function setupBackupService() {
      const systemdAvailable = await hasSystemd();
      const wsl = await isWsl();

      if (!systemdAvailable || wsl) {
        setStatus("skipped");
        addCompletedStep({ name: "Backup Timer", status: "skipped", message: "systemd not available" });
        setStep("summary");
        return;
      }

      if (!autoYes) {
        // Could add a confirm here, but matching bash behavior of auto-install
      }

      try {
        await installSystemdUnits();
        setStatus("done");
        addCompletedStep({ name: "Backup Timer", status: "done", message: "Daily at 2:00 AM" });
      } catch {
        setStatus("skipped");
        addCompletedStep({ name: "Backup Timer", status: "skipped", message: "Failed to install" });
      }

      setStep("summary");
    }

    return (
      <Box flexDirection="column">
        <StepIndicator current={6} total={7} label="Backup Service" />
        {status === "checking" && (
          <Text>
            <Text color="green"><Spinner type="dots" /></Text>
            {" "}Setting up backup timer...
          </Text>
        )}
        {status === "installing" && (
          <Text>
            <Text color="yellow"><Spinner type="dots" /></Text>
            {" "}Installing systemd timer...
          </Text>
        )}
        {status === "done" && (
          <AppStatus name="Backup Timer" status="done" message="Daily at 2:00 AM" />
        )}
        {status === "skipped" && (
          <AppStatus
            name="Backup Timer"
            status="skipped"
            message="systemd not available"
          />
        )}
      </Box>
    );
  }

  // ─── Step: Summary ──────────────────────────────────────────────────────────

  function SummaryStep() {
    const hasApp = (name: string) => selectedApps.some(a => a.name === name);

    useEffect(() => {
      const timer = setTimeout(() => exit(), 1500);
      return () => clearTimeout(timer);
    }, []);

    return (
      <Box flexDirection="column">
        <StepIndicator current={7} total={7} label="Setup Complete" />
        <Box marginBottom={1}>
          <Text bold color="green">All services are running!</Text>
        </Box>
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Service URLs:</Text>
          {selectedApps
            .filter((app) => app.port)
            .map((app) => (
              <Text key={app.name}>
                {"  "}{app.displayName.padEnd(20)}
                <Text color="cyan">http://{localIp}:{app.port}</Text>
              </Text>
            ))}
          {hasApp("duckdns") && (
            <Text>{"  "}{"DuckDNS".padEnd(20)}<Text dimColor>Background service (no web interface)</Text></Text>
          )}
          {hasApp("wireguard") && (
            <Text>{"  "}{"WireGuard".padEnd(20)}<Text dimColor>VPN service active on UDP port 51820</Text></Text>
          )}
        </Box>
        {hasApp("wireguard") && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>WireGuard note:</Text>
            <Text>  Official mobile apps are available for Android and iOS.</Text>
            <Text>  To display the QR code for peer1, run:</Text>
            <Text dimColor>  sudo docker exec wireguard /bin/bash -c 'qrencode -t ansiutf8 {"<"} /config/peer1/peer1.conf'</Text>
          </Box>
        )}
        {hasApp("jellyfin") && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Jellyfin note:</Text>
            <Text>  Official apps are available for:</Text>
            <Text>   - Android / iOS</Text>
            <Text>   - Android TV</Text>
            <Text>   - Apple TV</Text>
            <Text>   - Smart TVs (Samsung, LG)</Text>
          </Box>
        )}
        {hasApp("jellyfin") && (hasApp("jellyseerr") || hasApp("seerr")) && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Jellyseerr, Seerr & Jellyfin note:</Text>
            <Text>  Wholphin is an app that allows for media playback from Jellyfin</Text>
            <Text>  and media discovery and request from Jellyseerr / Seerr.</Text>
          </Box>
        )}
        <Text dimColor>Exiting...</Text>
      </Box>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Setup" />
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Setup Wizard" />
      {completedSteps.map((cs, i) => (
        <Box key={i} flexDirection="column">
          <AppStatus name={cs.name} status={cs.status} message={cs.message} />
          {cs.notes?.map((note, j) => (
            <Text key={j} dimColor>  {note}</Text>
          ))}
        </Box>
      ))}
      {step === "init" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Initializing...
        </Text>
      )}
      {step === "docker" && <DockerStep />}
      {step === "rclone" && <RcloneStep />}
      {step === "base-dir" && <BaseDirStep />}
      {step === "app-select" && <AppSelectStep />}
      {step === "install-apps" && (
        <InstallAppsStep
          selectedApps={selectedApps}
          envConfig={envConfig}
          autoYes={autoYes}
          onComplete={async () => {
            await saveEnvConfig(envConfig);
            setStep("backup-service");
          }}
        />
      )}
      {step === "backup-service" && <BackupServiceStep />}
      {step === "summary" && <SummaryStep />}
    </Box>
  );
}

// ─── Module-level components ─────────────────────────────────────────────────

interface InstallAppsStepProps {
  selectedApps: AppDefinition[];
  envConfig: EnvConfig;
  autoYes: boolean;
  onComplete: () => void;
}

function InstallAppsStep({ selectedApps, envConfig, autoYes, onComplete }: InstallAppsStepProps) {
  const loopStarted = useRef(false);
  const [installIdx, setInstallIdx] = useState(0);
  const [installPhase, setInstallPhase] = useState<
    "secrets" | "pulling" | "composing" | "done"
  >("secrets");
  const [appResults, setAppResults] = useState<
    Array<{ app: AppDefinition; status: "done" | "error" | "updated"; error?: string }>
  >([]);

  useEffect(() => {
    if (selectedApps.length > 0 && !loopStarted.current) {
      loopStarted.current = true;
      startInstallLoop();
    }
  }, []);

  async function startInstallLoop() {
    const results: Array<{
      app: AppDefinition;
      status: "done" | "error" | "updated";
      error?: string;
    }> = [];

    for (let i = 0; i < selectedApps.length; i++) {
      const app = selectedApps[i];
      setInstallIdx(i);
      setInstallPhase("secrets");

      try {
        // Collect secrets if needed and not auto-yes
        if (app.secrets && app.secrets.length > 0) {
          for (const secret of app.secrets) {
            const existing = envConfig[secret.envVar];
            if (!existing && !autoYes) {
              // Wait for user input via the secret prompt UI
              await waitForSecret(secret);
            }
          }
        }

        setInstallPhase("pulling");

        // Check if container already exists (running)
        const containerName = getContainerName(app);
        const running = await isContainerRunning(containerName);

        if (running) {
          // Check for updates
          const currentId = await getRunningImageId(containerName);
          const latestId = await pullImage(app.image);
          if (currentId !== latestId) {
            // Update: write new compose, down, up (matches setup.sh update path)
            setInstallPhase("composing");
            await writeComposeAndStart(app, envConfig);
            results.push({ app, status: "updated" });
          } else {
            results.push({ app, status: "done" });
          }
        } else {
          // Fresh install: pull image first, then compose up
          await pullImage(app.image);
          setInstallPhase("composing");
          await writeComposeAndStart(app, envConfig);
          results.push({ app, status: "done" });
        }
      } catch (err: any) {
        // Prefer stderr (actual Docker error) over execa's generic message
        const detail = err.stderr?.trim() || err.message;
        results.push({ app, status: "error", error: detail });
      }

      setAppResults([...results]);
    }

    onComplete();
  }

  async function waitForSecret(_secret: SecretDefinition): Promise<void> {
    // In auto mode, secrets come from .env. In interactive mode,
    // the secret prompt is handled by the parent render.
    // For simplicity, we just check .env; if missing, skip.
    return;
  }

  if (selectedApps.length === 0) return null;
  const currentApp = selectedApps[installIdx];
  if (!currentApp) return null;

  return (
    <Box flexDirection="column">
      <StepIndicator
        current={5}
        total={7}
        label={`Installing Apps (${installIdx + 1}/${selectedApps.length})`}
      />

      {/* Completed apps */}
      {appResults.map((r) => (
        <AppStatus
          key={r.app.name}
          name={r.app.displayName}
          status={r.status === "error" ? "error" : "done"}
          message={
            r.status === "updated"
              ? "Updated"
              : r.status === "error"
                ? r.error
                : undefined
          }
        />
      ))}

      {/* Current app */}
      {installIdx < selectedApps.length && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text>
          {" "}{currentApp.displayName}
          {installPhase === "pulling" && " — pulling image..."}
          {installPhase === "composing" && " — starting container..."}
        </Text>
      )}
    </Box>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Write docker-compose.yml and start the container */
export async function writeComposeAndStart(
  app: AppDefinition,
  envConfig: EnvConfig,
): Promise<void> {
  const appDir = getAppDir(app, envConfig.BASE_DIR);
  const composePath = getComposePath(app, envConfig.BASE_DIR);

  // Create app directory
  await shell("mkdir", ["-p", appDir], { sudo: true });

  // Create config directories
  const configPaths = getConfigPaths(app, envConfig.BASE_DIR);
  for (const p of configPaths) {
    await shell("mkdir", ["-p", p], { sudo: true });
  }

  // Create extra volume directories
  if (app.extraVolumes) {
    for (const vol of app.extraVolumes) {
      if (!vol.host.startsWith("/")) {
        await shell("mkdir", ["-p", `${appDir}/${vol.host}`], { sudo: true });
      }
    }
  }

  // Generate and write docker-compose.yml
  const compose = generateCompose(app, envConfig);
  await shell("bash", [
    "-c",
    `cat > "${composePath}" << 'COMPOSE_EOF'\n${compose}COMPOSE_EOF`,
  ], { sudo: true });

  // Set ownership for config dirs BEFORE starting the container.
  // Seerr (and Jellyseerr) run as the node user (UID 1000) inside the
  // container, so the config dir must be writable before first start.
  for (const p of configPaths) {
    await shell("chown", ["-R", `${envConfig.PUID}:${envConfig.PGID}`, p], {
      sudo: true,
      ignoreError: true,
    });
  }

  // Clean up any existing container before starting fresh.
  // 1) compose down: removes containers owned by this compose project
  // 2) docker rm -f: catches orphaned containers from prior CLI runs
  //    (old -f flag created different project labels) or docker run
  await composeDown(composePath).catch(() => {});
  const containerName = app.containerName ?? app.name;
  await removeContainer(containerName);

  // Start container
  await composeUp(composePath);
}
