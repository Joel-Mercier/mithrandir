import { shell, commandExists } from "./shell.js";
import { existsSync } from "fs";

/** Check if rclone is installed */
export async function isRcloneInstalled(): Promise<boolean> {
  return commandExists("rclone");
}

/**
 * Resolve the rclone config file path.
 * When running under sudo, the config lives under the original user's home,
 * not /root. We detect this via SUDO_USER and look up their home directory.
 */
async function resolveRcloneConfigArgs(): Promise<string[]> {
  const sudoUser = process.env.SUDO_USER;
  if (!sudoUser) return [];

  // Look up the original user's home directory via getent
  const result = await shell("getent", ["passwd", sudoUser], { ignoreError: true });
  if (result.exitCode !== 0 || !result.stdout.trim()) return [];

  const homeDir = result.stdout.split(":")[5];
  if (!homeDir) return [];

  const configPath = `${homeDir}/.config/rclone/rclone.conf`;
  if (!existsSync(configPath)) return [];

  return ["--config", configPath];
}

/**
 * Check if a specific rclone remote is configured (matches bash: rclone listremotes | grep).
 * Returns { configured: true } or { configured: false, reason: string } for diagnostics.
 */
export async function isRcloneRemoteConfigured(
  remoteName: string,
): Promise<{ configured: true } | { configured: false; reason: string }> {
  const configArgs = await resolveRcloneConfigArgs();
  const result = await shell("rclone", [...configArgs, "listremotes"], { ignoreError: true });

  if (result.exitCode !== 0) {
    return {
      configured: false,
      reason: [
        `rclone listremotes failed (exit ${result.exitCode})`,
        `stderr: ${result.stderr.trim() || "(empty)"}`,
        `HOME=${process.env.HOME ?? "(unset)"}`,
        `SUDO_USER=${process.env.SUDO_USER ?? "(unset)"}`,
        configArgs.length ? `config: ${configArgs[1]}` : "config: (default)",
      ].join(", "),
    };
  }

  const remotes = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const found = remotes.some((line) => line === `${remoteName}:`);
  if (!found) {
    return {
      configured: false,
      reason: [
        `remote '${remoteName}:' not found in: [${remotes.join(", ") || "(empty)"}]`,
        `HOME=${process.env.HOME ?? "(unset)"}`,
        `SUDO_USER=${process.env.SUDO_USER ?? "(unset)"}`,
        configArgs.length ? `config: ${configArgs[1]}` : "config: (default)",
      ].join(", "),
    };
  }
  return { configured: true };
}

/** Install rclone via the official install script */
export async function installRclone(): Promise<void> {
  await shell("bash", [
    "-c",
    "curl -fsSL https://rclone.org/install.sh | sudo bash",
  ]);
}

/** Upload a local directory to a remote path */
export async function upload(
  localPath: string,
  remote: string,
  remotePath: string,
): Promise<void> {
  const configArgs = await resolveRcloneConfigArgs();
  await shell("rclone", [
    ...configArgs,
    "copy",
    localPath,
    `${remote}:${remotePath}`,
    "--log-level",
    "INFO",
  ]);
}

/** Download a remote file to a local directory */
export async function download(
  remote: string,
  remotePath: string,
  localDir: string,
): Promise<void> {
  const configArgs = await resolveRcloneConfigArgs();
  await shell("rclone", [...configArgs, "copy", `${remote}:${remotePath}`, localDir]);
}

/** List directories at a remote path. Returns directory names. */
export async function listDirs(
  remote: string,
  remotePath: string,
): Promise<string[]> {
  const configArgs = await resolveRcloneConfigArgs();
  const result = await shell(
    "rclone",
    [...configArgs, "lsd", `${remote}:${remotePath}`],
    { ignoreError: true },
  );

  if (result.exitCode !== 0 || !result.stdout.trim()) return [];

  // rclone lsd output: "          -1 2025-01-01 00:00:00        -1 dirname"
  return result.stdout
    .trim()
    .split("\n")
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      return parts[parts.length - 1];
    })
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
}

/** Check if a remote file exists */
export async function remoteFileExists(
  remote: string,
  remotePath: string,
): Promise<boolean> {
  const configArgs = await resolveRcloneConfigArgs();
  const result = await shell(
    "rclone",
    [...configArgs, "ls", `${remote}:${remotePath}`],
    { ignoreError: true },
  );
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}

/** List files at a remote path. Returns filenames (without size). */
export async function listFiles(
  remote: string,
  remotePath: string,
): Promise<string[]> {
  const configArgs = await resolveRcloneConfigArgs();
  const result = await shell(
    "rclone",
    [...configArgs, "ls", `${remote}:${remotePath}`],
    { ignoreError: true },
  );

  if (result.exitCode !== 0 || !result.stdout.trim()) return [];

  // rclone ls output: "    <size> <filename>"
  return result.stdout
    .trim()
    .split("\n")
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      return parts.slice(1).join(" ");
    })
    .filter(Boolean)
    .sort();
}

/** Delete a remote directory */
export async function purgeRemote(
  remote: string,
  remotePath: string,
): Promise<void> {
  const configArgs = await resolveRcloneConfigArgs();
  await shell("rclone", [...configArgs, "purge", `${remote}:${remotePath}`]);
}

/**
 * Rotate remote backups: keep only the most recent `retention` backups.
 */
export async function rotateRemote(
  remote: string,
  basePath: string,
  retention: number,
): Promise<string[]> {
  const dirs = await listDirs(remote, basePath);
  const deleted: string[] = [];

  if (dirs.length > retention) {
    const toDelete = dirs.slice(0, dirs.length - retention);
    for (const dir of toDelete) {
      await purgeRemote(remote, `${basePath}/${dir}`);
      deleted.push(dir);
    }
  }

  return deleted;
}
