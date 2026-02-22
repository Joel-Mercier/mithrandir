import { useState, useEffect, useRef } from "react";
import { Box, Text, useApp } from "ink";
import { MultiSelect, TextInput, PasswordInput, ConfirmInput } from "@inkjs/ui";
import Spinner from "ink-spinner";
import {
  APP_REGISTRY,
  getApp,
  getAppDir,
  getContainerName,
  getComposePath,
  getConfigPaths,
  filterConflicts,
} from "@/lib/apps.js";
import {
  isDockerInstalled,
  waitForDocker,
  installDocker,
  isContainerRunning,
  getRunningImageId,
  pullImageWithProgress,
  removeContainer,
  composeUp,
  composeDown,
} from "@/lib/docker.js";
import { isRcloneInstalled, installRclone } from "@/lib/rclone.js";
import { generateCompose } from "@/lib/compose.js";
import {
  hasSystemd,
  isWsl,
  installSystemdUnits,
} from "@/lib/systemd.js";
import { detectDistro, getLocalIp } from "@/lib/distro.js";
import { loadEnvConfig, saveEnvConfig } from "@/lib/config.js";
import { shell } from "@/lib/shell.js";
import { Header } from "@/components/Header.js";
import { StepIndicator } from "@/components/StepIndicator.js";
import { AppStatus } from "@/components/AppStatus.js";
import { ProgressBar } from "@/components/ProgressBar.js";
import { Divider } from "@/components/Divider.js";
import Link from "ink-link";
import type { AppDefinition, EnvConfig, SecretDefinition } from "@/types.js";
import { homedir } from "os";
import { createQBittorrentClient, getQBittorrentCredentials } from "@/lib/qbittorrent.js";
import { createProwlarrClient, getProwlarrApiKey } from "@/lib/prowlarr.js";
import { createRadarrClient, getRadarrApiKey } from "@/lib/radarr.js";
import { createSonarrClient, getSonarrApiKey } from "@/lib/sonarr.js";
import { createLidarrClient, getLidarrApiKey } from "@/lib/lidarr.js";
import { createJellyfinClient, getJellyfinApiKey } from "@/lib/jellyfin.js";
import { createSeerrClient, getSeerrApiKey } from "@/lib/seerr.js";

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
  | "confirm-autosetup"
  | "autosetup-apps"
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
        <StepIndicator current={1} total={8} label="Docker" />
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
                setError("Docker is required. Abortin | gsetup.");
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
        <StepIndicator current={2} total={8} label="rclone" />
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
                setError("rclone is required for backups. Abortin | gsetup.");
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
        <StepIndicator current={3} total={8} label="Base Directory" />
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
        const allApps = APP_REGISTRY
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
        <StepIndicator current={4} total={8} label="Select Apps" />
        <Text>Choose services to install (space to toggle, enter to confirm):</Text>
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
        <StepIndicator current={7} total={8} label="Backup Service" />
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
        <StepIndicator current={8} total={8} label="Setup Complete" />
        <Box marginBottom={1}>
          <Text bold color="green">All services are running!</Text>
        </Box>
        <Divider title="Service URLs" titleColor="yellow" dividerColor="gray" />
        <Box flexDirection="column" marginBottom={1}>
          {selectedApps
            .filter((app) => app.port)
            .map((app) => (
              <Text key={app.name}>
                {"  "}{app.displayName.padEnd(20)}
                <Link url={`http://${localIp}:${app.port}`}>
                  <Text color="cyan">http://{localIp}:{app.port}</Text>
                </Link>
              </Text>
            ))}
          {hasApp("duckdns") && (
            <Text>{"  "}{"DuckDNS".padEnd(20)}<Text dimColor>Background service (no web interface)</Text></Text>
          )}
          {hasApp("wireguard") && (
            <Text>{"  "}{"WireGuard".padEnd(20)}<Text dimColor>VPN service active on UDP port 51820</Text></Text>
          )}
        </Box>
        {(hasApp("wireguard") || hasApp("jellyfin") || (hasApp("jellyfin") && hasApp("seerr"))) && (
          <Divider title="Notes" titleColor="yellow" dividerColor="gray" />
        )}
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
        {hasApp("jellyfin") && hasApp("seerr") && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Seerr & Jellyfin note:</Text>
            <Text>  Wholphin is an app that allows for media playback from Jellyfin</Text>
            <Text>  and media discovery and request from Seerr.</Text>
          </Box>
        )}
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Remote backups note:</Text>
          <Text>  To configure rclone for Google Drive, run: rclone config,</Text>
          <Text>  This will set up the remote connection to your Google Drive.</Text>
        </Box>
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
            setStep("confirm-autosetup");
          }}
        />
      )}
      {step === "confirm-autosetup" && (
        <ConfirmAutoSetupStep
          selectedApps={selectedApps}
          autoYes={autoYes}
          onYes={() => setStep("autosetup-apps")}
          onNo={() => setStep("backup-service")}
        />
      )}
      {step === "autosetup-apps" && (
        <AutoSetupAppsStep
          selectedApps={selectedApps}
          envConfig={envConfig}
          localIp={localIp}
          autoYes={autoYes}
          onComplete={(results) => {
            for (const r of results) {
              addCompletedStep({
                name: `  ${r.displayName} setup`,
                status: r.status === "done" ? "done" : "skipped",
                message: r.status === "done"
                  ? (r.warnings.length > 0 ? `Done (${r.warnings.length} warning${r.warnings.length > 1 ? "s" : ""})` : "Configured")
                  : r.error ?? "Failed",
                notes: r.warnings.length > 0 ? r.warnings.map((w) => `  ⚠ ${w}`) : undefined,
              });
            }
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
  const [pullProgress, setPullProgress] = useState(0);

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
        setPullProgress(0);

        // Check if container already exists (running)
        const containerName = getContainerName(app);
        const running = await isContainerRunning(containerName);

        if (running) {
          // Check for updates
          const currentId = await getRunningImageId(containerName);
          const latestId = await pullImageWithProgress(
            app.image,
            (pct) => setPullProgress(pct),
          );
          if (currentId !== latestId) {
            // Update: write new compose, down, up (matche | ssetup.sh update path)
            setInstallPhase("composing");
            await writeComposeAndStart(app, envConfig);
            results.push({ app, status: "updated" });
          } else {
            results.push({ app, status: "done" });
          }
        } else {
          // Fresh install: pull image first, then compose up
          await pullImageWithProgress(
            app.image,
            (pct) => setPullProgress(pct),
          );
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
        total={8}
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
        <Box flexDirection="column">
          <Text>
            <Text color="yellow"><Spinner type="dots" /></Text>
            {" "}{currentApp.displayName}
            {installPhase === "pulling" && " — pulling image..."}
            {installPhase === "composing" && " — starting container..."}
          </Text>
          {installPhase === "pulling" && pullProgress > 0 && pullProgress < 100 && (
            <ProgressBar percent={pullProgress} />
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Confirm Auto Setup Step ──────────────────────────────────────────────────

interface ConfirmAutoSetupStepProps {
  selectedApps: AppDefinition[];
  autoYes: boolean;
  onYes: () => void;
  onNo: () => void;
}

function ConfirmAutoSetupStep({ selectedApps, autoYes, onYes, onNo }: ConfirmAutoSetupStepProps) {
  const hasSetupableApps = selectedApps.some((app) => AUTO_SETUP_APPS_ORDER.includes(app.name));

  useEffect(() => {
    if (!hasSetupableApps) {
      onNo();
      return;
    }
    if (autoYes) {
      onYes();
    }
  }, []);

  if (autoYes || !hasSetupableApps) return null;

  return (
    <Box flexDirection="column">
      <StepIndicator current={6} total={8} label="Automatic Setup" />
      <Text>Would you like to automatically configure your apps (credentials, download clients, etc.)?</Text>
      <ConfirmInput onConfirm={onYes} onCancel={onNo} />
    </Box>
  );
}

// ─── Auto Setup Apps Step ─────────────────────────────────────────────────────

interface AutoSetupResult {
  appName: string;
  displayName: string;
  status: "done" | "error";
  error?: string;
  warnings: string[];
}

interface AutoSetupAppsStepProps {
  selectedApps: AppDefinition[];
  envConfig: EnvConfig;
  localIp: string;
  autoYes: boolean;
  onComplete: (results: AutoSetupResult[]) => void;
}

const AUTO_SETUP_APPS_ORDER = ["qbittorrent", "prowlarr", "radarr", "sonarr", "lidarr", "jellyfin", "seerr"];

type PromptState =
  | "username"
  | "password"
  | "jellyfin-server-name"
  | "jellyfin-language"
  | "jellyfin-country"
  | null;

/** Wrap an API call with a descriptive label for error context. */
async function apiCall<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const detail = err.stderr?.trim() || err.message;
    throw new Error(`${label}: ${detail}`);
  }
}

function AutoSetupAppsStep({ selectedApps, envConfig, localIp, autoYes, onComplete }: AutoSetupAppsStepProps) {
  const loopStarted = useRef(false);
  const promptResolver = useRef<((value: string) => void) | null>(null);

  const [setupIdx, setSetupIdx] = useState(0);
  const [setupPhase, setSetupPhase] = useState<"credentials" | "setting-up" | "done">("credentials");
  const [promptState, setPromptState] = useState<PromptState>(null);
  const [promptDefault, setPromptDefault] = useState("");
  const [appResults, setAppResults] = useState<AutoSetupResult[]>([]);

  const setupableApps = selectedApps
    .filter((app) => AUTO_SETUP_APPS_ORDER.includes(app.name))
    .sort((a, b) => AUTO_SETUP_APPS_ORDER.indexOf(a.name) - AUTO_SETUP_APPS_ORDER.indexOf(b.name));

  useEffect(() => {
    if (setupableApps.length > 0 && !loopStarted.current) {
      loopStarted.current = true;
      startSetupLoop();
    }
  }, []);

  function promptUser(state: PromptState, defaultValue: string): Promise<string> {
    if (autoYes) return Promise.resolve(defaultValue);
    return new Promise((resolve) => {
      promptResolver.current = resolve;
      setPromptDefault(defaultValue);
      setPromptState(state);
    });
  }

  function handlePromptSubmit(value: string) {
    const resolver = promptResolver.current;
    promptResolver.current = null;
    const currentState = promptState;
    setPromptState(null);
    // PasswordInput has no defaultValue — use the default if submitted empty
    const resolved = (currentState === "password" && !value) ? promptDefault : value;
    resolver?.(resolved);
  }

  function hasApp(name: string): boolean {
    return selectedApps.some((a) => a.name === name);
  }

  async function startSetupLoop() {
    const results: AutoSetupResult[] = [];
    let defaultUsername = autoYes ? "admin" : "";
    let defaultPassword = autoYes ? "admin" : "";
    let jellyfinServerName = "Jellyfin";
    let jellyfinLanguage = "en";
    let jellyfinCountry = "US";

    // Cross-app credential store
    let qbtUsername = "";
    let qbtPassword = "";
    let jellyfinApiKey = "";
    let jellyfinUsername = "";
    let jellyfinPassword = "";

    for (let i = 0; i < setupableApps.length; i++) {
      const app = setupableApps[i];
      const baseUrl = app.port ? `http://${localIp}:${app.port}` : undefined;
      setSetupIdx(i);
      setSetupPhase("credentials");
      const warnings: string[] = [];

      try {
        // Prompt for username/password (Jellyfin gets extra prompts)
        const username = await promptUser("username", defaultUsername || "admin");
        defaultUsername = username;

        const password = await promptUser("password", defaultPassword || "admin");
        defaultPassword = password;

        let serverName = jellyfinServerName;
        let language = jellyfinLanguage;
        let country = jellyfinCountry;
        if (app.name === "jellyfin") {
          serverName = await promptUser("jellyfin-server-name", jellyfinServerName);
          jellyfinServerName = serverName;
          language = await promptUser("jellyfin-language", jellyfinLanguage);
          jellyfinLanguage = language;
          country = await promptUser("jellyfin-country", jellyfinCountry);
          jellyfinCountry = country;
        }

        setSetupPhase("setting-up");

        // ── qBittorrent ──────────────────────────────────────────────
        if (app.name === "qbittorrent") {
          const creds = await apiCall("Read temporary credentials", () => getQBittorrentCredentials(envConfig.BASE_DIR));
          if (!creds) throw new Error("Read temporary credentials: no temporary password found in container logs");
          const client = createQBittorrentClient({ baseUrl });
          const login = await apiCall("Login with temporary credentials", () => client.auth.login(creds.username, creds.password));
          if (!login.success) throw new Error("Login with temporary credentials: login failed (IP may be banned after too many attempts)");
          await apiCall("Set download path and credentials", () => client.app.setPreferences({
            save_path: "/data/downloads",
            auto_tmm_enabled: true,
            web_ui_username: username,
            web_ui_password: password,
          }));
          qbtUsername = username;
          qbtPassword = password;
        }

        // ── Prowlarr ─────────────────────────────────────────────────
        if (app.name === "prowlarr") {
          const apiKey = await apiCall("Read API key from config.xml", () => getProwlarrApiKey(envConfig.BASE_DIR));
          if (!apiKey) throw new Error("Read API key from config.xml: file missing or key not found");
          const client = createProwlarrClient({ apiKey, baseUrl });
          const hostConfig = await apiCall("Get host configuration", () => client.hostConfig.get());
          await apiCall("Set authentication to forms-based", () => client.hostConfig.update(hostConfig.id!, {
            ...hostConfig,
            authenticationMethod: "forms",
            username,
            password,
            passwordConfirmation: password,
          }));
          // Register *arr apps as applications in Prowlarr
          const arrApps: Array<{ name: string; impl: string; contract: string; port: number; getKey: () => Promise<string | null> }> = [];
          if (hasApp("radarr")) arrApps.push({ name: "Radarr", impl: "Radarr", contract: "RadarrSettings", port: 7878, getKey: () => getRadarrApiKey(envConfig.BASE_DIR) });
          if (hasApp("sonarr")) arrApps.push({ name: "Sonarr", impl: "Sonarr", contract: "SonarrSettings", port: 8989, getKey: () => getSonarrApiKey(envConfig.BASE_DIR) });
          if (hasApp("lidarr")) arrApps.push({ name: "Lidarr", impl: "Lidarr", contract: "LidarrSettings", port: 8686, getKey: () => getLidarrApiKey(envConfig.BASE_DIR) });
          for (const arr of arrApps) {
            try {
              const arrApiKey = await arr.getKey();
              if (!arrApiKey) { warnings.push(`Register ${arr.name}: could not read API key`); continue; }
              await apiCall(`Register ${arr.name} application`, () => client.application.create({
                name: arr.name,
                implementation: arr.impl,
                configContract: arr.contract,
                syncLevel: "fullSync",
                fields: [
                  { order: 0, name: "prowlarrUrl", label: "Prowlarr URL", value: `http://${localIp}:9696` },
                  { order: 1, name: "baseUrl", label: "Base URL", value: `http://${localIp}:${arr.port}` },
                  { order: 2, name: "apiKey", label: "API Key", value: arrApiKey },
                ],
              }));
            } catch (err: any) {
              warnings.push(err.message);
            }
          }
        }

        // ── Radarr ───────────────────────────────────────────────────
        if (app.name === "radarr") {
          const apiKey = await apiCall("Read API key from config.xml", () => getRadarrApiKey(envConfig.BASE_DIR));
          if (!apiKey) throw new Error("Read API key from config.xml: file missing or key not found");
          const client = createRadarrClient({ apiKey, baseUrl });
          const hostConfig = await apiCall("Get host configuration", () => client.hostConfig.get());
          await apiCall("Set authentication to forms-based", () => client.hostConfig.update(hostConfig.id!, {
            ...hostConfig,
            authenticationMethod: "forms",
            username,
            password,
            passwordConfirmation: password,
          }));
          if (hasApp("qbittorrent")) {
            try {
              await apiCall("Add qBittorrent download client", () => client.downloadClient.create({
                name: "qBittorrent",
                implementation: "QBittorrent",
                configContract: "QBittorrentSettings",
                protocol: "torrent",
                enable: true,
                priority: 1,
                removeCompletedDownloads: true,
                removeFailedDownloads: true,
                fields: [
                  { order: 0, name: "host", label: "Host", value: localIp },
                  { order: 1, name: "port", label: "Port", value: 8080 },
                  { order: 2, name: "username", label: "Username", value: qbtUsername },
                  { order: 3, name: "password", label: "Password", value: qbtPassword },
                ],
              }));
            } catch (err: any) {
              warnings.push(err.message);
            }
          }
          try {
            await apiCall("Create movies root folder", () => client.rootFolder.create({ path: "/data/media/movies" }));
          } catch (err: any) {
            warnings.push(err.message);
          }
        }

        // ── Sonarr ───────────────────────────────────────────────────
        if (app.name === "sonarr") {
          const apiKey = await apiCall("Read API key from config.xml", () => getSonarrApiKey(envConfig.BASE_DIR));
          if (!apiKey) throw new Error("Read API key from config.xml: file missing or key not found");
          const client = createSonarrClient({ apiKey, baseUrl });
          const hostConfig = await apiCall("Get host configuration", () => client.hostConfig.get());
          await apiCall("Set authentication to forms-based", () => client.hostConfig.update(hostConfig.id!, {
            ...hostConfig,
            authenticationMethod: "forms",
            username,
            password,
            passwordConfirmation: password,
          }));
          if (hasApp("qbittorrent")) {
            try {
              await apiCall("Add qBittorrent download client", () => client.downloadClient.create({
                name: "qBittorrent",
                implementation: "QBittorrent",
                configContract: "QBittorrentSettings",
                protocol: "torrent",
                enable: true,
                priority: 1,
                removeCompletedDownloads: true,
                removeFailedDownloads: true,
                fields: [
                  { order: 0, name: "host", label: "Host", value: localIp },
                  { order: 1, name: "port", label: "Port", value: 8080 },
                  { order: 2, name: "username", label: "Username", value: qbtUsername },
                  { order: 3, name: "password", label: "Password", value: qbtPassword },
                ],
              }));
            } catch (err: any) {
              warnings.push(err.message);
            }
          }
          try {
            await apiCall("Create TV root folder", () => client.rootFolder.create({ path: "/data/media/tv" }));
          } catch (err: any) {
            warnings.push(err.message);
          }
        }

        // ── Lidarr ───────────────────────────────────────────────────
        if (app.name === "lidarr") {
          const apiKey = await apiCall("Read API key from config.xml", () => getLidarrApiKey(envConfig.BASE_DIR));
          if (!apiKey) throw new Error("Read API key from config.xml: file missing or key not found");
          const client = createLidarrClient({ apiKey, baseUrl });
          const hostConfig = await apiCall("Get host configuration", () => client.hostConfig.get());
          await apiCall("Set authentication to forms-based", () => client.hostConfig.update(hostConfig.id!, {
            ...hostConfig,
            authenticationMethod: "forms",
            username,
            password,
            passwordConfirmation: password,
          }));
          if (hasApp("qbittorrent")) {
            try {
              await apiCall("Add qBittorrent download client", () => client.downloadClient.create({
                name: "qBittorrent",
                implementation: "QBittorrent",
                configContract: "QBittorrentSettings",
                protocol: "torrent",
                enable: true,
                priority: 1,
                removeCompletedDownloads: true,
                removeFailedDownloads: true,
                fields: [
                  { order: 0, name: "host", label: "Host", value: localIp },
                  { order: 1, name: "port", label: "Port", value: 8080 },
                  { order: 2, name: "username", label: "Username", value: qbtUsername },
                  { order: 3, name: "password", label: "Password", value: qbtPassword },
                ],
              }));
            } catch (err: any) {
              warnings.push(err.message);
            }
          }
          try {
            await apiCall("Create music root folder", () => client.rootFolder.create({ path: "/data/media/music", name: "Music", defaultMetadataProfileId: 1, defaultQualityProfileId: 1 }));
          } catch (err: any) {
            warnings.push(err.message);
          }
        }

        // ── Jellyfin ─────────────────────────────────────────────────
        if (app.name === "jellyfin") {
          // Store credentials early so Seerr can use them even if the wizard partially fails
          jellyfinUsername = username;
          jellyfinPassword = password;
          const client = createJellyfinClient({ baseUrl });
          const info = await apiCall("Check startup wizard status", () => client.system.getPublicInfo());
          if (!info.StartupWizardCompleted) {
            await apiCall("Set server configuration", () => client.startup.updateConfiguration({
              ServerName: serverName,
              UICulture: language,
              MetadataCountryCode: country,
              PreferredMetadataLanguage: language,
            }));
            // Initialize the first user record before updating it
            await apiCall("Get initial user record", () => client.startup.getFirstUser());
            await apiCall("Set admin user credentials", () => client.startup.updateUser({ Name: username, Password: password }));
            await apiCall("Enable remote access", () => client.startup.setRemoteAccess({ EnableRemoteAccess: true, EnableAutomaticPortMapping: false }));
            await apiCall("Complete startup wizard", () => client.startup.complete());
          }
          // Authenticate and create an API key for subsequent calls
          const apiKeyResult = await apiCall("Create API key", () => getJellyfinApiKey(baseUrl!, username, password));
          jellyfinApiKey = apiKeyResult ?? "";
          // Create an authenticated client for library setup
          if (jellyfinApiKey) {
            const authClient = createJellyfinClient({ baseUrl, apiKey: jellyfinApiKey });
            try {
              await apiCall("Create Movies library", () => authClient.library.addVirtualFolder({
                name: "Movies",
                collectionType: "movies",
                paths: ["/data/media/movies"],
                refreshLibrary: false,
              }));
            } catch (err: any) {
              warnings.push(err.message);
            }
            try {
              await apiCall("Create Series library", () => authClient.library.addVirtualFolder({
                name: "Series",
                collectionType: "tvshows",
                paths: ["/data/media/tv"],
                refreshLibrary: false,
              }));
            } catch (err: any) {
              warnings.push(err.message);
            }
          }
        }

        // ── Seerr ────────────────────────────────────────────────────
        if (app.name === "seerr") {
          const apiKey = await apiCall("Read API key from settings.json", () => getSeerrApiKey(envConfig.BASE_DIR));
          if (!apiKey) throw new Error("Read API key from settings.json: file missing or key not found");
          const client = createSeerrClient({ apiKey, baseUrl });
          const jellyfinUrl = `http://${localIp}:8096`;

          // Initialize Seerr admin via Jellyfin login — this must happen first
          // on a fresh install because all other endpoints return 403 until an
          // admin user exists.  loginJellyfin also configures the Jellyfin
          // connection, so jellyfinSettings.update afterwards ensures the
          // admin credentials are explicitly persisted.
          if (hasApp("jellyfin") && jellyfinUsername) {
            await apiCall("Initialize Seerr admin via Jellyfin login", () => client.auth.loginJellyfin({
              username: jellyfinUsername,
              password: jellyfinPassword,
              hostname: jellyfinUrl,
            }));

            await apiCall("Configure Jellyfin connection", () => client.jellyfinSettings.update({
              hostname: jellyfinUrl,
              adminUser: jellyfinUsername,
              adminPass: jellyfinPassword,
            }));

            // Sync and enable libraries
            try {
              const libs = await apiCall("Sync Jellyfin libraries", () => client.jellyfinSettings.getLibraries({ sync: true }));
              const movieLib = libs.find((l) => l.name.toLowerCase().includes("movie"));
              const tvLib = libs.find((l) => l.name.toLowerCase().includes("tv") || l.name.toLowerCase().includes("show") || l.name.toLowerCase().includes("series"));
              const enableIds = [movieLib?.id, tvLib?.id].filter(Boolean).join(",");
              if (enableIds) {
                await apiCall("Enable media libraries", () => client.jellyfinSettings.getLibraries({ enable: enableIds }));
              }
            } catch (err: any) {
              warnings.push(err.message);
            }

            // Import Jellyfin admin user
            try {
              const jellyfinUsers = await apiCall("Get Jellyfin users", () => client.jellyfinSettings.getJellyfinUsers());
              const adminUser = jellyfinUsers.find((u) => u.username === jellyfinUsername);
              if (adminUser) {
                await apiCall("Import Jellyfin admin user", () => client.users.importFromJellyfin([adminUser.id]));
              }
            } catch (err: any) {
              warnings.push(err.message);
            }
          }

          // Connect Radarr
          if (hasApp("radarr")) {
            try {
              const radarrApiKey = await getRadarrApiKey(envConfig.BASE_DIR);
              if (radarrApiKey) {
                await apiCall("Connect Radarr", () => client.radarr.create({
                  name: "Radarr",
                  hostname: localIp,
                  port: 7878,
                  apiKey: radarrApiKey,
                  useSsl: false,
                  activeProfileId: 1,
                  activeProfileName: "Any",
                  activeDirectory: "/data/media/movies",
                  is4k: false,
                  minimumAvailability: "released",
                  isDefault: true,
                }));
              } else {
                warnings.push("Connect Radarr: could not read API key");
              }
            } catch (err: any) {
              warnings.push(err.message);
            }
          }

          // Connect Sonarr
          if (hasApp("sonarr")) {
            try {
              const sonarrApiKey = await getSonarrApiKey(envConfig.BASE_DIR);
              if (sonarrApiKey) {
                await apiCall("Connect Sonarr", () => client.sonarr.create({
                  name: "Sonarr",
                  hostname: localIp,
                  port: 8989,
                  apiKey: sonarrApiKey,
                  useSsl: false,
                  activeProfileId: 1,
                  activeProfileName: "Any",
                  activeDirectory: "/data/media/tv",
                  is4k: false,
                  enableSeasonFolders: true,
                  isDefault: true,
                }));
              } else {
                warnings.push("Connect Sonarr: could not read API key");
              }
            } catch (err: any) {
              warnings.push(err.message);
            }
          }
        }

        results.push({ appName: app.name, displayName: app.displayName, status: "done", warnings: [...warnings] });
      } catch (err: any) {
        const detail = err.message;
        results.push({ appName: app.name, displayName: app.displayName, status: "error", error: detail, warnings: [...warnings] });
      }

      setAppResults([...results]);
    }

    setSetupPhase("done");
    onComplete(results);
  }

  if (setupableApps.length === 0) {
    useEffect(() => { onComplete([]); }, []);
    return null;
  }

  const currentApp = setupableApps[setupIdx];
  const promptLabel =
    promptState === "username" ? `Enter username for ${currentApp?.displayName ?? "app"}:` :
    promptState === "password" ? `Enter password for ${currentApp?.displayName ?? "app"}:` :
    promptState === "jellyfin-server-name" ? "Enter Jellyfin server name:" :
    promptState === "jellyfin-language" ? "Enter preferred metadata language (e.g. en):" :
    promptState === "jellyfin-country" ? "Enter metadata country code (e.g. US):" :
    null;

  return (
    <Box flexDirection="column">
      <StepIndicator
        current={6}
        total={8}
        label={`Auto-Setup (${setupIdx + 1}/${setupableApps.length})`}
      />

      {/* Completed apps */}
      {appResults.map((r) => (
        <Box key={r.appName} flexDirection="column">
          <AppStatus
            name={r.displayName}
            status={r.status === "error" ? "error" : "done"}
            message={
              r.status === "error"
                ? r.error
                : r.warnings.length > 0
                  ? `Done (${r.warnings.length} warning${r.warnings.length > 1 ? "s" : ""})`
                  : undefined
            }
          />
          {r.warnings.map((w, j) => (
            <Text key={j} color="yellow">    ⚠ {w}</Text>
          ))}
        </Box>
      ))}

      {/* Current app */}
      {setupPhase !== "done" && currentApp && !promptState && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text>
          {" "}{currentApp.displayName}
          {setupPhase === "credentials" && " — collecting credentials..."}
          {setupPhase === "setting-up" && " — configuring..."}
        </Text>
      )}

      {/* User prompts */}
      {promptState && promptLabel && promptState === "password" && (
        <Box flexDirection="column">
          <Text>{promptLabel}</Text>
          <Box>
            <Text color="blue">{">"} </Text>
            <PasswordInput
              key={`${currentApp?.name}-${promptState}`}
              placeholder={promptDefault}
              onSubmit={handlePromptSubmit}
            />
          </Box>
        </Box>
      )}
      {promptState && promptLabel && promptState !== "password" && (
        <Box flexDirection="column">
          <Text>{promptLabel}</Text>
          <Box>
            <Text color="blue">{">"} </Text>
            <TextInput
              key={`${currentApp?.name}-${promptState}`}
              defaultValue={promptDefault}
              onSubmit={handlePromptSubmit}
            />
          </Box>
        </Box>
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
  // Seerr runs as the node user (UID 1000) inside the
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
