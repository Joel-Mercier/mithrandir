import { createInterface } from "readline";
import { existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { getApp, getAppNames, getAppDir } from "../lib/apps.js";
import { shell, commandExists } from "../lib/shell.js";
import { loadEnvConfig } from "../lib/config.js";

// ---------------------------------------------------------------------------
// ANSI helpers (match uninstall.sh colours)
// ---------------------------------------------------------------------------
const GREEN = "\x1b[0;32m";
const YELLOW = "\x1b[1;33m";
const RED = "\x1b[0;31m";
const BLUE = "\x1b[0;34m";
const NC = "\x1b[0m";

function info(msg: string) {
  console.log(`${GREEN}[INFO]${NC} ${msg}`);
}
function warn(msg: string) {
  console.log(`${YELLOW}[WARN]${NC} ${msg}`);
}
function error(msg: string) {
  console.log(`${RED}[ERROR]${NC} ${msg}`);
}
function section(msg: string) {
  console.log(`\n${BLUE}--- ${msg} ---${NC}`);
}

// ---------------------------------------------------------------------------
// Readline prompt helper
// ---------------------------------------------------------------------------
function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

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
    error("This command must be run as root (use sudo).");
    process.exit(1);
  }

  const autoYes = flags.yes ?? false;
  const appArg = args[0];

  if (appArg) {
    await uninstallApp(appArg, autoYes);
  } else {
    await uninstallSystem(autoYes);
  }
}

// ===========================================================================
// Per-app uninstall (matches setup.sh uninstall_app())
// ===========================================================================
async function uninstallApp(appName: string, autoYes: boolean) {
  const app = getApp(appName);
  if (!app) {
    error(`Unknown app: ${appName}`);
    console.log(`Valid apps: ${getAppNames().join(", ")}`);
    process.exit(1);
  }

  const env = await loadEnvConfig();
  const appDir = getAppDir(app, env.BASE_DIR);

  if (!existsSync(appDir)) {
    error(`App directory not found: ${appDir}`);
    console.log(`Is '${appName}' installed?`);
    process.exit(1);
  }

  console.log("");
  console.log("=============================================");
  console.log(` Uninstalling: ${appName}`);
  console.log("=============================================");
  console.log("");

  // Stop and remove container via docker compose
  const composePath = `${appDir}/docker-compose.yml`;
  if (existsSync(composePath)) {
    console.log("Stopping and removing container...");
    await shell("docker", ["compose", "down"], { cwd: appDir, ignoreError: true });
    console.log("Container stopped and removed.");
  } else {
    warn(`No docker-compose.yml found in ${appDir}`);
  }

  // Ask about removing data
  console.log("");
  console.log(`App directory: ${appDir}`);

  let removeData = autoYes;
  if (!autoYes) {
    const answer = await prompt(
      "Remove app directory and all its data? (This is irreversible) (y/N): ",
    );
    removeData = /^[Yy]$/.test(answer);
  }

  if (removeData) {
    await shell("rm", ["-rf", appDir]);
    console.log(`Removed: ${appDir}`);
  } else {
    console.log(`Kept app directory: ${appDir}`);
    console.log(`You can manually remove it later with: sudo rm -rf ${appDir}`);
  }

  console.log("");
  console.log(`Uninstall of '${appName}' complete.`);
}

// ===========================================================================
// Full system uninstall (matches uninstall.sh)
// ===========================================================================
const BACKUP_DIR = "/backups";
const SERVICE_NAME = "homelab-backup";
const LOG_FILE = "/var/log/homelab-backup.log";

async function uninstallSystem(autoYes: boolean) {
  console.log("");
  console.log("============================================");
  console.log("  Homelab Complete Uninstall");
  console.log("============================================");
  console.log("");
  warn("This will permanently remove:");
  console.log("  - All running and stopped Docker containers");
  console.log("  - All Docker images, volumes, and networks");
  console.log("  - Docker Engine, CLI, containerd, and plugins");
  console.log("  - All Docker configuration files");
  console.log(`  - Backup systemd timer and service (${SERVICE_NAME})`);
  console.log("  - rclone and its configuration");
  console.log(`  - All local backups in ${BACKUP_DIR}`);
  console.log(`  - Backup log at ${LOG_FILE}`);
  console.log("");

  if (!autoYes) {
    const confirm = await prompt("Are you sure you want to continue? (y/N): ");
    if (!/^[Yy]$/.test(confirm)) {
      info("Uninstall cancelled.");
      return;
    }
  }

  await step1RemoveSystemdUnits();
  await step2StopDocker();
  await step3RemoveDocker();
  await step4RemoveRclone();
  await step5DeleteBackups();
  await step6RemoveAppData(autoYes);

  console.log("");
  console.log("============================================");
  info("Homelab has been completely uninstalled.");
  console.log("============================================");
  console.log("");
}

// ---------------------------------------------------------------------------
// Step 1/6: Remove backup systemd units
// ---------------------------------------------------------------------------
async function step1RemoveSystemdUnits() {
  section("Step 1/6: Removing backup systemd units");

  // Stop timer
  const timerActive = await shell(
    "systemctl",
    ["is-active", "--quiet", `${SERVICE_NAME}.timer`],
    { ignoreError: true },
  );
  if (timerActive.exitCode === 0) {
    await shell("systemctl", ["stop", `${SERVICE_NAME}.timer`]);
    info(`Stopped ${SERVICE_NAME}.timer.`);
  } else {
    warn(`${SERVICE_NAME}.timer is not running.`);
  }

  // Disable timer
  const timerEnabled = await shell(
    "systemctl",
    ["is-enabled", "--quiet", `${SERVICE_NAME}.timer`],
    { ignoreError: true },
  );
  if (timerEnabled.exitCode === 0) {
    await shell("systemctl", ["disable", `${SERVICE_NAME}.timer`]);
    info(`Disabled ${SERVICE_NAME}.timer.`);
  } else {
    warn(`${SERVICE_NAME}.timer is not enabled.`);
  }

  // Stop service
  const serviceActive = await shell(
    "systemctl",
    ["is-active", "--quiet", `${SERVICE_NAME}.service`],
    { ignoreError: true },
  );
  if (serviceActive.exitCode === 0) {
    await shell("systemctl", ["stop", `${SERVICE_NAME}.service`]);
    info(`Stopped ${SERVICE_NAME}.service.`);
  } else {
    warn(`${SERVICE_NAME}.service is not running.`);
  }

  // Remove unit files
  for (const unitFile of [
    `/etc/systemd/system/${SERVICE_NAME}.timer`,
    `/etc/systemd/system/${SERVICE_NAME}.service`,
  ]) {
    if (existsSync(unitFile)) {
      await shell("rm", ["-f", unitFile]);
      info(`Removed ${unitFile}`);
    } else {
      warn(`${unitFile} does not exist — skipping.`);
    }
  }

  await shell("systemctl", ["daemon-reload"]);
  info("Systemd daemon reloaded.");

  // Remove log file
  if (existsSync(LOG_FILE)) {
    await shell("rm", ["-f", LOG_FILE]);
    info(`Removed backup log ${LOG_FILE}`);
  }
}

// ---------------------------------------------------------------------------
// Step 2/6: Stop Docker services
// ---------------------------------------------------------------------------
async function step2StopDocker() {
  section("Step 2/6: Stopping Docker services");

  const dockerActive = await shell(
    "systemctl",
    ["is-active", "--quiet", "docker"],
    { ignoreError: true },
  );
  if (dockerActive.exitCode === 0) {
    await shell("systemctl", ["stop", "docker"]);
    info("Docker service stopped.");
  } else {
    warn("Docker service is not running.");
  }

  const containerdActive = await shell(
    "systemctl",
    ["is-active", "--quiet", "containerd"],
    { ignoreError: true },
  );
  if (containerdActive.exitCode === 0) {
    await shell("systemctl", ["stop", "containerd"]);
    info("containerd service stopped.");
  } else {
    warn("containerd service is not running.");
  }
}

// ---------------------------------------------------------------------------
// Step 3/6: Remove Docker containers, images, volumes, and packages
// ---------------------------------------------------------------------------
async function step3RemoveDocker() {
  section("Step 3/6: Removing Docker containers, images, volumes, and packages");

  if (await commandExists("docker")) {
    info("Removing all containers, images, volumes, and networks...");
    const prune = await shell(
      "docker",
      ["system", "prune", "-a", "--volumes", "-f"],
      { ignoreError: true },
    );
    if (prune.exitCode === 0) {
      info("Docker system prune completed.");
    } else {
      warn("Docker system prune encountered issues (Docker may already be stopped).");
    }

    // Remove custom networks
    const nets = await shell(
      "docker",
      ["network", "ls", "--filter", "type=custom", "-q"],
      { ignoreError: true },
    );
    if (nets.exitCode === 0 && nets.stdout.trim()) {
      info("Removing custom Docker networks...");
      const networkIds = nets.stdout.trim().split("\n");
      const rmResult = await shell("docker", ["network", "rm", ...networkIds], {
        ignoreError: true,
      });
      if (rmResult.exitCode === 0) {
        info("Custom networks removed.");
      } else {
        warn("Some networks could not be removed.");
      }
    } else {
      info("No custom Docker networks to remove.");
    }
  } else {
    warn("Docker command not found — skipping container/image/network cleanup.");
  }

  // Purge packages
  info("Purging Docker packages...");
  const purge = await shell(
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
  if (purge.exitCode === 0) {
    info("Docker packages purged.");
  } else {
    warn("Some Docker packages were not installed or already removed.");
  }

  info("Running autoremove to clean up unused dependencies...");
  const autoremove = await shell("apt", ["autoremove", "-y"], {
    ignoreError: true,
  });
  if (autoremove.exitCode === 0) {
    info("Autoremove completed.");
  } else {
    warn("Autoremove encountered issues.");
  }

  // Remove Docker data directories
  info("Removing Docker data directories...");
  for (const dir of ["/var/lib/docker", "/var/lib/containerd", "/etc/docker"]) {
    if (existsSync(dir)) {
      await shell("rm", ["-rf", dir]);
      info(`Removed ${dir}`);
    } else {
      warn(`${dir} does not exist — skipping.`);
    }
  }

  // Remove user .docker dirs
  for (const pattern of ["/home", "/root"]) {
    if (pattern === "/root") {
      const rootDocker = "/root/.docker";
      if (existsSync(rootDocker)) {
        await shell("rm", ["-rf", rootDocker]);
        info(`Removed ${rootDocker}`);
      }
    } else {
      // Scan /home/*/. docker
      if (existsSync("/home")) {
        try {
          const homes = readdirSync("/home");
          for (const user of homes) {
            const userDocker = `/home/${user}/.docker`;
            if (existsSync(userDocker)) {
              await shell("rm", ["-rf", userDocker]);
              info(`Removed ${userDocker}`);
            }
          }
        } catch {
          // /home may not be readable
        }
      }
    }
  }

  // Remove APT repo and GPG key
  if (existsSync("/etc/apt/sources.list.d/docker.list")) {
    await shell("rm", ["-f", "/etc/apt/sources.list.d/docker.list"]);
    info("Removed Docker APT repository.");
  }

  if (existsSync("/etc/apt/keyrings/docker.asc")) {
    await shell("rm", ["-f", "/etc/apt/keyrings/docker.asc"]);
    info("Removed Docker GPG keyring.");
  }
}

// ---------------------------------------------------------------------------
// Step 4/6: Uninstall rclone
// ---------------------------------------------------------------------------
async function step4RemoveRclone() {
  section("Step 4/6: Uninstalling rclone");

  if (await commandExists("rclone")) {
    const which = await shell("which", ["rclone"]);
    const rcloneBin = which.stdout.trim();
    await shell("rm", ["-f", rcloneBin]);
    info(`Removed rclone binary (${rcloneBin}).`);
  } else {
    warn("rclone is not installed — skipping binary removal.");
  }

  // Remove man pages
  for (const manFile of [
    "/usr/local/share/man/man1/rclone.1",
    "/usr/share/man/man1/rclone.1",
  ]) {
    if (existsSync(manFile)) {
      await shell("rm", ["-f", manFile]);
      info(`Removed ${manFile}`);
    }
  }

  // Remove rclone config for all users
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
      info(`Removed rclone config ${confDir}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 5/6: Delete local backups
// ---------------------------------------------------------------------------
async function step5DeleteBackups() {
  section("Step 5/6: Deleting local backups");

  if (existsSync(BACKUP_DIR)) {
    await shell("rm", ["-rf", BACKUP_DIR]);
    info(`Removed all local backups in ${BACKUP_DIR}`);
  } else {
    warn(`${BACKUP_DIR} does not exist — skipping.`);
  }
}

// ---------------------------------------------------------------------------
// Step 6/6: Remove app data directories
// ---------------------------------------------------------------------------
async function step6RemoveAppData(autoYes: boolean) {
  section("Step 6/6: Removing app data directories");

  // Determine default base dir (invoking user's home, even under sudo)
  let defaultBaseDir: string;
  const sudoUser = process.env.SUDO_USER;
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

  console.log("");
  warn("This will delete all app data directories (bazarr, sonarr, jellyfin, etc.).");
  console.log(
    "  Hidden files/directories (.*) and the 'homelab' project directory will be kept.",
  );
  console.log("");

  let baseDir: string;
  if (autoYes) {
    baseDir = defaultBaseDir;
  } else {
    const answer = await prompt(
      `Enter the base directory used for the install [${defaultBaseDir}]: `,
    );
    baseDir = answer || defaultBaseDir;
  }

  if (!existsSync(baseDir)) {
    warn(`${baseDir} does not exist — skipping app data removal.`);
    return;
  }

  // List non-hidden, non-homelab directories
  info(`The following directories in ${baseDir} will be deleted:`);

  let dirs: string[];
  try {
    dirs = readdirSync(baseDir).filter((name) => {
      if (name.startsWith(".")) return false;
      if (name === "homelab") return false;
      const fullPath = `${baseDir}/${name}`;
      try {
        return statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    dirs = [];
  }

  if (dirs.length === 0) {
    info("No app data directories found — nothing to remove.");
    return;
  }

  for (const d of dirs) {
    console.log(`  ${d}`);
  }

  let doDelete = autoYes;
  if (!autoYes) {
    console.log("");
    const confirmApps = await prompt("Delete these directories? (y/N): ");
    doDelete = /^[Yy]$/.test(confirmApps);
  }

  if (doDelete) {
    for (const d of dirs) {
      await shell("rm", ["-rf", `${baseDir}/${d}`]);
    }
    info(`All app data directories in ${baseDir} have been removed.`);
  } else {
    info("Skipped app data removal.");
  }
}
