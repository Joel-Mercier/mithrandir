import { existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { shell, commandExists } from "@/lib/shell.js";
import { removeUiService } from "@/lib/systemd-ui.js";
import { removeTusdService } from "@/lib/systemd-tusd.js";
import { BACKUP_LOG_PATH, RESTORE_LOG_PATH } from "@/lib/logger.js";

const BACKUP_SERVICE_NAME = "homelab-backup";
const UPDATE_LOG_PATH = "/var/log/mithrandir-ui-update.log";

// ---------------------------------------------------------------------------
// Step 1: Stop all Docker apps
// ---------------------------------------------------------------------------

/** Stop all Mithrandir-managed Docker apps by running compose down in each app dir */
export async function stopAllApps(baseDir: string): Promise<string[]> {
  const dirs = getAppDataDirs(baseDir);
  const stopped: string[] = [];

  for (const name of dirs) {
    const dir = `${baseDir}/${name}`;
    const composePath = `${dir}/docker-compose.yml`;
    if (existsSync(composePath)) {
      await shell("docker", ["compose", "down"], {
        sudo: true,
        cwd: dir,
        ignoreError: true,
      });
      stopped.push(name);
    }
  }

  // Prune unused networks
  await shell("docker", ["network", "prune", "-f"], {
    sudo: true,
    ignoreError: true,
  });

  return stopped;
}

// ---------------------------------------------------------------------------
// Step 2: Remove all systemd units (backup, UI, tusd)
// ---------------------------------------------------------------------------

export async function removeAllSystemdUnits(): Promise<void> {
  // Backup timer + service
  const timerActive = await shell(
    "systemctl",
    ["is-active", "--quiet", `${BACKUP_SERVICE_NAME}.timer`],
    { ignoreError: true },
  );
  if (timerActive.exitCode === 0) {
    await shell("systemctl", ["stop", `${BACKUP_SERVICE_NAME}.timer`], {
      sudo: true,
    });
  }

  const timerEnabled = await shell(
    "systemctl",
    ["is-enabled", "--quiet", `${BACKUP_SERVICE_NAME}.timer`],
    { ignoreError: true },
  );
  if (timerEnabled.exitCode === 0) {
    await shell("systemctl", ["disable", `${BACKUP_SERVICE_NAME}.timer`], {
      sudo: true,
    });
  }

  const serviceActive = await shell(
    "systemctl",
    ["is-active", "--quiet", `${BACKUP_SERVICE_NAME}.service`],
    { ignoreError: true },
  );
  if (serviceActive.exitCode === 0) {
    await shell("systemctl", ["stop", `${BACKUP_SERVICE_NAME}.service`], {
      sudo: true,
    });
  }

  for (const unitFile of [
    `/etc/systemd/system/${BACKUP_SERVICE_NAME}.timer`,
    `/etc/systemd/system/${BACKUP_SERVICE_NAME}.service`,
  ]) {
    if (existsSync(unitFile)) {
      await shell("rm", ["-f", unitFile], { sudo: true });
    }
  }

  // UI + tusd services (they handle daemon-reload internally)
  await removeUiService();
  await removeTusdService();

  // Final daemon-reload to be safe
  await shell("systemctl", ["daemon-reload"], { sudo: true });
}

// ---------------------------------------------------------------------------
// Step 3: Delete local backups
// ---------------------------------------------------------------------------

export async function deleteBackups(backupDir: string): Promise<boolean> {
  if (existsSync(backupDir)) {
    await shell("rm", ["-rf", backupDir], { sudo: true });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Step 4: Uninstall rclone
// ---------------------------------------------------------------------------

export async function removeRclone(): Promise<boolean> {
  let removed = false;

  if (await commandExists("rclone")) {
    const which = await shell("which", ["rclone"]);
    const rcloneBin = which.stdout.trim();
    await shell("rm", ["-f", rcloneBin], { sudo: true });
    removed = true;
  }

  for (const manFile of [
    "/usr/local/share/man/man1/rclone.1",
    "/usr/share/man/man1/rclone.1",
  ]) {
    if (existsSync(manFile)) {
      await shell("rm", ["-f", manFile], { sudo: true });
    }
  }

  // Remove rclone configs for all users
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
      await shell("rm", ["-rf", confDir], { sudo: true });
      removed = true;
    }
  }

  return removed;
}

// ---------------------------------------------------------------------------
// Step 5: Get and remove app data directories
// ---------------------------------------------------------------------------

/** List non-hidden, non-mithrandir directories in baseDir */
export function getAppDataDirs(baseDir: string): string[] {
  try {
    return readdirSync(baseDir).filter((name) => {
      if (name.startsWith(".")) return false;
      if (name === "mithrandir") return false;
      try {
        return statSync(`${baseDir}/${name}`).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/** Resolve the effective base directory (handles SUDO_USER) */
export async function resolveBaseDir(): Promise<string> {
  const sudoUser = process.env.SUDO_USER;
  if (sudoUser) {
    const passwd = await shell("getent", ["passwd", sudoUser], {
      ignoreError: true,
    });
    if (passwd.exitCode === 0 && passwd.stdout) {
      return passwd.stdout.split(":")[5] ?? homedir();
    }
  }
  return homedir();
}

export async function removeAppDataDirs(
  baseDir: string,
  dirs: string[],
): Promise<void> {
  for (const d of dirs) {
    await shell("rm", ["-rf", `${baseDir}/${d}`], { sudo: true });
  }
}

// ---------------------------------------------------------------------------
// Step 6: Remove Docker
// ---------------------------------------------------------------------------

export async function stopDocker(): Promise<void> {
  const dockerActive = await shell(
    "systemctl",
    ["is-active", "--quiet", "docker"],
    { ignoreError: true },
  );
  if (dockerActive.exitCode === 0) {
    await shell("systemctl", ["stop", "docker"], { sudo: true });
  }

  const containerdActive = await shell(
    "systemctl",
    ["is-active", "--quiet", "containerd"],
    { ignoreError: true },
  );
  if (containerdActive.exitCode === 0) {
    await shell("systemctl", ["stop", "containerd"], { sudo: true });
  }
}

export async function removeDocker(): Promise<void> {
  if (await commandExists("docker")) {
    await shell("docker", ["system", "prune", "-a", "--volumes", "-f"], {
      ignoreError: true,
    });

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
    { sudo: true, ignoreError: true },
  );

  await shell("apt", ["autoremove", "-y"], { sudo: true, ignoreError: true });

  for (const dir of ["/var/lib/docker", "/var/lib/containerd", "/etc/docker"]) {
    if (existsSync(dir)) {
      await shell("rm", ["-rf", dir], { sudo: true });
    }
  }

  // Remove user .docker dirs
  if (existsSync("/home")) {
    try {
      for (const user of readdirSync("/home")) {
        const userDocker = `/home/${user}/.docker`;
        if (existsSync(userDocker)) {
          await shell("rm", ["-rf", userDocker], { sudo: true });
        }
      }
    } catch {
      // /home may not be readable
    }
  }
  const rootDocker = "/root/.docker";
  if (existsSync(rootDocker)) {
    await shell("rm", ["-rf", rootDocker], { sudo: true });
  }

  if (existsSync("/etc/apt/sources.list.d/docker.list")) {
    await shell("rm", ["-f", "/etc/apt/sources.list.d/docker.list"], {
      sudo: true,
    });
  }

  if (existsSync("/etc/apt/keyrings/docker.asc")) {
    await shell("rm", ["-f", "/etc/apt/keyrings/docker.asc"], { sudo: true });
  }
}

// ---------------------------------------------------------------------------
// Step 7: Remove log files
// ---------------------------------------------------------------------------

export async function removeLogs(): Promise<void> {
  for (const logFile of [BACKUP_LOG_PATH, RESTORE_LOG_PATH, UPDATE_LOG_PATH]) {
    if (existsSync(logFile)) {
      await shell("rm", ["-f", logFile], { sudo: true });
    }
  }
}

// ---------------------------------------------------------------------------
// Step 8: Remove CLI symlink and cache
// ---------------------------------------------------------------------------

export async function removeCliArtifacts(): Promise<void> {
  if (existsSync("/usr/local/bin/mithrandir")) {
    await shell("rm", ["-f", "/usr/local/bin/mithrandir"], { sudo: true });
  }

  // Remove update check cache
  const sudoUser = process.env.SUDO_USER;
  const homes: string[] = [];
  if (sudoUser) {
    const passwd = await shell("getent", ["passwd", sudoUser], {
      ignoreError: true,
    });
    if (passwd.exitCode === 0 && passwd.stdout) {
      homes.push(passwd.stdout.split(":")[5] ?? homedir());
    }
  }
  if (homes.length === 0) homes.push(homedir());

  for (const home of homes) {
    const cacheDir = `${home}/.cache/mithrandir`;
    if (existsSync(cacheDir)) {
      await shell("rm", ["-rf", cacheDir], { sudo: true });
    }
  }
}

// ---------------------------------------------------------------------------
// Step 9: Remove .env config file
// ---------------------------------------------------------------------------

export async function removeEnvFile(projectRoot: string): Promise<boolean> {
  const envPath = `${projectRoot}/.env`;
  if (existsSync(envPath)) {
    await shell("rm", ["-f", envPath], { sudo: true });
    return true;
  }
  return false;
}
