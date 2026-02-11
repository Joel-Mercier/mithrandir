import { shell, commandExists } from "./shell.js";

/** Check if rclone is installed */
export async function isRcloneInstalled(): Promise<boolean> {
  return commandExists("rclone");
}

/** Check if a specific rclone remote is configured (matches bash: rclone listremotes | grep) */
export async function isRcloneRemoteConfigured(
  remoteName: string,
): Promise<boolean> {
  // Use sudo because rclone config is typically stored in /root/.config/rclone/
  // (setup and systemd service run as root)
  const result = await shell("rclone", ["listremotes"], { sudo: true, ignoreError: true });
  if (result.exitCode !== 0) return false;
  return result.stdout
    .split("\n")
    .some((line) => line.trim() === `${remoteName}:`);
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
  await shell("rclone", [
    "copy",
    localPath,
    `${remote}:${remotePath}`,
    "--log-level",
    "INFO",
  ], { sudo: true });
}

/** Download a remote file to a local directory */
export async function download(
  remote: string,
  remotePath: string,
  localDir: string,
): Promise<void> {
  await shell("rclone", ["copy", `${remote}:${remotePath}`, localDir], { sudo: true });
}

/** List directories at a remote path. Returns directory names. */
export async function listDirs(
  remote: string,
  remotePath: string,
): Promise<string[]> {
  const result = await shell(
    "rclone",
    ["lsd", `${remote}:${remotePath}`],
    { sudo: true, ignoreError: true },
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
  const result = await shell(
    "rclone",
    ["ls", `${remote}:${remotePath}`],
    { sudo: true, ignoreError: true },
  );
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}

/** Delete a remote directory */
export async function purgeRemote(
  remote: string,
  remotePath: string,
): Promise<void> {
  await shell("rclone", ["purge", `${remote}:${remotePath}`], { sudo: true });
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
