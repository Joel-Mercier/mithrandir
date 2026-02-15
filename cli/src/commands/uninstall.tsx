import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { ConfirmInput, StatusMessage } from "@inkjs/ui";
import { existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { getApp, getAppNames, getAppDir } from "../lib/apps.js";
import { shell, commandExists } from "../lib/shell.js";
import { loadEnvConfig } from "../lib/config.js";
import { BACKUP_LOG_PATH } from "../lib/logger.js";
import { Header } from "../components/Header.js";
import { AppStatus } from "../components/AppStatus.js";

// ---------------------------------------------------------------------------
// PATH safety — ensure standard paths exist when running under sudo/systemd
// ---------------------------------------------------------------------------
function ensurePath() {
  const required = [
    "/usr/local/sbin",
    "/usr/local/bin",
    "/usr/sbin",
    "/usr/bin",
    "/sbin",
    "/bin",
  ];
  const current = (process.env.PATH ?? "").split(":");
  for (const p of required) {
    if (!current.includes(p)) current.push(p);
  }
  process.env.PATH = current.join(":");
}

// ===========================================================================
// Per-app uninstall (interactive Ink component)
// ===========================================================================

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

function AppUninstallInteractive({
  appName,
  autoYes,
}: {
  appName: string;
  autoYes: boolean;
}) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<
    "init" | "stopping" | "confirm-delete" | "deleting" | "done"
  >("init");
  const [currentLabel, setCurrentLabel] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [appDir, setAppDir] = useState("");

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
    const dir = getAppDir(app, env.BASE_DIR);
    setAppDir(dir);

    if (!existsSync(dir)) {
      setError(`App directory not found: ${dir}\nIs '${appName}' installed?`);
      return;
    }

    // Stop and remove container
    const composePath = `${dir}/docker-compose.yml`;
    if (existsSync(composePath)) {
      setPhase("stopping");
      setCurrentLabel(`Stopping ${appName} container...`);
      await shell("docker", ["compose", "down", "--volumes"], { cwd: dir, ignoreError: true });
      // Prune unused networks to reclaim Docker subnet address pool
      await shell("docker", ["network", "prune", "-f"], { ignoreError: true });
      addStep({ name: "Stop container", status: "done", message: "Container stopped and removed" });
    } else {
      addStep({ name: "Stop container", status: "skipped", message: "No docker-compose.yml found" });
    }

    // Ask about removing data
    if (autoYes) {
      await deleteAppData(dir);
    } else {
      setPhase("confirm-delete");
    }
  }

  async function deleteAppData(dir: string) {
    setPhase("deleting");
    setCurrentLabel("Removing app data...");
    await shell("rm", ["-rf", dir]);
    addStep({ name: "Remove data", status: "done", message: `Removed ${dir}` });
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  function handleConfirmDelete() {
    deleteAppData(appDir);
  }

  function handleCancelDelete() {
    addStep({
      name: "Remove data",
      status: "skipped",
      message: `Kept ${appDir}`,
    });
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title={`Uninstall: ${appName}`} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title={`Uninstall: ${appName}`} />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {(phase === "init" || phase === "stopping" || phase === "deleting") && (
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
          <Text>Remove app directory and all its data? (This is irreversible)</Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />
          </Box>
        </Box>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Uninstall of '{appName}' complete
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

// ===========================================================================
// Full system uninstall (interactive Ink component)
// ===========================================================================

const BACKUP_DIR = "/backups";
const SERVICE_NAME = "homelab-backup";
const LOG_FILE = BACKUP_LOG_PATH;

function SystemUninstallInteractive({ autoYes }: { autoYes: boolean }) {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [phase, setPhase] = useState<
    "confirm" | "running" | "confirm-appdata" | "deleting-appdata" | "done"
  >("confirm");
  const [currentLabel, setCurrentLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [appDataDirs, setAppDataDirs] = useState<string[]>([]);
  const [baseDir, setBaseDir] = useState("");

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    if (autoYes) {
      runFullUninstall();
    }
  }, []);

  async function runFullUninstall() {
    setPhase("running");

    // Step 1/6: Remove backup systemd units
    setCurrentLabel("Removing backup systemd units...");
    await step1RemoveSystemdUnits();
    addStep({ name: "Systemd units", status: "done", message: "Removed" });

    // Step 2/6: Stop Docker services
    setCurrentLabel("Stopping Docker services...");
    await step2StopDocker();
    addStep({ name: "Docker services", status: "done", message: "Stopped" });

    // Step 3/6: Remove Docker
    setCurrentLabel("Removing Docker containers, images, and packages...");
    await step3RemoveDocker();
    addStep({ name: "Docker removal", status: "done", message: "Purged" });

    // Step 4/6: Uninstall rclone
    setCurrentLabel("Uninstalling rclone...");
    await step4RemoveRclone();
    addStep({ name: "rclone", status: "done", message: "Removed" });

    // Step 5/6: Delete local backups
    setCurrentLabel("Deleting local backups...");
    await step5DeleteBackups();
    if (existsSync(BACKUP_DIR)) {
      addStep({ name: "Local backups", status: "done", message: `Removed ${BACKUP_DIR}` });
    } else {
      addStep({ name: "Local backups", status: "skipped", message: `${BACKUP_DIR} does not exist` });
    }

    // Step 6/6: Remove app data
    await prepareAppDataStep();
  }

  async function prepareAppDataStep() {
    const sudoUser = process.env.SUDO_USER;
    let defaultBaseDir: string;
    if (sudoUser) {
      const passwd = await shell("getent", ["passwd", sudoUser], {
        ignoreError: true,
      });
      if (passwd.exitCode === 0 && passwd.stdout) {
        defaultBaseDir = passwd.stdout.split(":")[5] ?? homedir();
      } else {
        defaultBaseDir = homedir();
      }
    } else {
      defaultBaseDir = homedir();
    }

    setBaseDir(defaultBaseDir);

    if (!existsSync(defaultBaseDir)) {
      addStep({ name: "App data", status: "skipped", message: `${defaultBaseDir} does not exist` });
      setPhase("done");
      setTimeout(() => {
        exit();
      }, 500);
      return;
    }

    const dirs = getAppDataDirs(defaultBaseDir);
    setAppDataDirs(dirs);

    if (dirs.length === 0) {
      addStep({ name: "App data", status: "skipped", message: "No app data directories found" });
      setPhase("done");
      setTimeout(() => exit(), 500);
      return;
    }

    if (autoYes) {
      await deleteAppDataDirs(defaultBaseDir, dirs);
    } else {
      setPhase("confirm-appdata");
    }
  }

  function getAppDataDirs(dir: string): string[] {
    try {
      return readdirSync(dir).filter((name) => {
        if (name.startsWith(".")) return false;
        if (name === "mithrandir") return false;
        try {
          return statSync(`${dir}/${name}`).isDirectory();
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }

  async function deleteAppDataDirs(dir: string, dirs: string[]) {
    setPhase("running");
    setCurrentLabel("Removing app data directories...");
    for (const d of dirs) {
      await shell("rm", ["-rf", `${dir}/${d}`]);
    }
    addStep({ name: "App data", status: "done", message: `Removed ${dirs.length} directory(ies) from ${dir}` });
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  function handleConfirm() {
    runFullUninstall();
  }

  function handleCancel() {
    setTimeout(() => exit(), 100);
  }

  function handleConfirmAppData() {
    deleteAppDataDirs(baseDir, appDataDirs);
  }

  function handleCancelAppData() {
    addStep({ name: "App data", status: "skipped", message: "Kept" });
    setPhase("done");
    setTimeout(() => exit(), 500);
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="System Uninstall" />
        {completedSteps.map((step, i) => (
          <AppStatus
            key={i}
            name={step.name}
            status={step.status}
            message={step.message}
          />
        ))}
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="System Uninstall" />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {phase === "confirm" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="yellow" bold>This will permanently remove:</Text>
          </Box>
          <Text>  - All running and stopped Docker containers</Text>
          <Text>  - All Docker images, volumes, and networks</Text>
          <Text>  - Docker Engine, CLI, containerd, and plugins</Text>
          <Text>  - All Docker configuration files</Text>
          <Text>  - Backup systemd timer and service ({SERVICE_NAME})</Text>
          <Text>  - rclone and its configuration</Text>
          <Text>  - All local backups in {BACKUP_DIR}</Text>
          <Text>  - Backup log at {LOG_FILE}</Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
          </Box>
        </Box>
      )}

      {phase === "running" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{currentLabel}
        </Text>
      )}

      {phase === "confirm-appdata" && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow" bold>The following directories in {baseDir} will be deleted:</Text>
          {appDataDirs.map((d) => (
            <Text key={d}>  {d}</Text>
          ))}
          <Text dimColor>  Hidden files/directories and 'mithrandir' will be kept.</Text>
          <Box marginTop={1}>
            <Text>Delete these directories? </Text>
            <ConfirmInput onConfirm={handleConfirmAppData} onCancel={handleCancelAppData} />
          </Box>
        </Box>
      )}

      {phase === "deleting-appdata" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Removing app data directories...
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Mithrandir has been completely uninstalled
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Step implementations (unchanged logic, just no console.log)
// ---------------------------------------------------------------------------

async function step1RemoveSystemdUnits() {
  const timerActive = await shell(
    "systemctl",
    ["is-active", "--quiet", `${SERVICE_NAME}.timer`],
    { ignoreError: true },
  );
  if (timerActive.exitCode === 0) {
    await shell("systemctl", ["stop", `${SERVICE_NAME}.timer`]);
  }

  const timerEnabled = await shell(
    "systemctl",
    ["is-enabled", "--quiet", `${SERVICE_NAME}.timer`],
    { ignoreError: true },
  );
  if (timerEnabled.exitCode === 0) {
    await shell("systemctl", ["disable", `${SERVICE_NAME}.timer`]);
  }

  const serviceActive = await shell(
    "systemctl",
    ["is-active", "--quiet", `${SERVICE_NAME}.service`],
    { ignoreError: true },
  );
  if (serviceActive.exitCode === 0) {
    await shell("systemctl", ["stop", `${SERVICE_NAME}.service`]);
  }

  for (const unitFile of [
    `/etc/systemd/system/${SERVICE_NAME}.timer`,
    `/etc/systemd/system/${SERVICE_NAME}.service`,
  ]) {
    if (existsSync(unitFile)) {
      await shell("rm", ["-f", unitFile]);
    }
  }

  await shell("systemctl", ["daemon-reload"]);

  if (existsSync(LOG_FILE)) {
    await shell("rm", ["-f", LOG_FILE]);
  }

  if (existsSync("/usr/local/bin/mithrandir")) {
    await shell("rm", ["-f", "/usr/local/bin/mithrandir"]);
  }
}

async function step2StopDocker() {
  const dockerActive = await shell(
    "systemctl",
    ["is-active", "--quiet", "docker"],
    { ignoreError: true },
  );
  if (dockerActive.exitCode === 0) {
    await shell("systemctl", ["stop", "docker"]);
  }

  const containerdActive = await shell(
    "systemctl",
    ["is-active", "--quiet", "containerd"],
    { ignoreError: true },
  );
  if (containerdActive.exitCode === 0) {
    await shell("systemctl", ["stop", "containerd"]);
  }
}

async function step3RemoveDocker() {
  if (await commandExists("docker")) {
    await shell(
      "docker",
      ["system", "prune", "-a", "--volumes", "-f"],
      { ignoreError: true },
    );

    const nets = await shell(
      "docker",
      ["network", "ls", "--filter", "type=custom", "-q"],
      { ignoreError: true },
    );
    if (nets.exitCode === 0 && nets.stdout.trim()) {
      const networkIds = nets.stdout.trim().split("\n");
      await shell("docker", ["network", "rm", ...networkIds], {
        ignoreError: true,
      });
    }
  }

  await shell(
    "apt",
    [
      "purge",
      "-y",
      "docker-ce",
      "docker-ce-cli",
      "containerd.io",
      "docker-buildx-plugin",
      "docker-compose-plugin",
    ],
    { ignoreError: true },
  );

  await shell("apt", ["autoremove", "-y"], { ignoreError: true });

  for (const dir of ["/var/lib/docker", "/var/lib/containerd", "/etc/docker"]) {
    if (existsSync(dir)) {
      await shell("rm", ["-rf", dir]);
    }
  }

  // Remove user .docker dirs
  if (existsSync("/home")) {
    try {
      for (const user of readdirSync("/home")) {
        const userDocker = `/home/${user}/.docker`;
        if (existsSync(userDocker)) {
          await shell("rm", ["-rf", userDocker]);
        }
      }
    } catch {
      // /home may not be readable
    }
  }
  const rootDocker = "/root/.docker";
  if (existsSync(rootDocker)) {
    await shell("rm", ["-rf", rootDocker]);
  }

  if (existsSync("/etc/apt/sources.list.d/docker.list")) {
    await shell("rm", ["-f", "/etc/apt/sources.list.d/docker.list"]);
  }

  if (existsSync("/etc/apt/keyrings/docker.asc")) {
    await shell("rm", ["-f", "/etc/apt/keyrings/docker.asc"]);
  }
}

async function step4RemoveRclone() {
  if (await commandExists("rclone")) {
    const which = await shell("which", ["rclone"]);
    const rcloneBin = which.stdout.trim();
    await shell("rm", ["-f", rcloneBin]);
  }

  for (const manFile of [
    "/usr/local/share/man/man1/rclone.1",
    "/usr/share/man/man1/rclone.1",
  ]) {
    if (existsSync(manFile)) {
      await shell("rm", ["-f", manFile]);
    }
  }

  const configDirs: string[] = [];
  if (existsSync("/home")) {
    try {
      for (const user of readdirSync("/home")) {
        configDirs.push(`/home/${user}/.config/rclone`);
      }
    } catch {
      // /home may not be readable
    }
  }
  configDirs.push("/root/.config/rclone");

  for (const confDir of configDirs) {
    if (existsSync(confDir)) {
      await shell("rm", ["-rf", confDir]);
    }
  }
}

async function step5DeleteBackups() {
  if (existsSync(BACKUP_DIR)) {
    await shell("rm", ["-rf", BACKUP_DIR]);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export async function runUninstall(
  args: string[],
  flags: { yes?: boolean },
) {
  ensurePath();

  // Root check
  if (process.getuid?.() !== 0) {
    console.error("Error: This command must be run as root (use sudo).");
    process.exit(1);
  }

  const autoYes = flags.yes ?? false;
  const appArg = args[0];

  if (appArg) {
    const { waitUntilExit } = render(
      <AppUninstallInteractive appName={appArg} autoYes={autoYes} />,
    );
    await waitUntilExit();
  } else {
    const { waitUntilExit } = render(
      <SystemUninstallInteractive autoYes={autoYes} />,
    );
    await waitUntilExit();
  }
}
