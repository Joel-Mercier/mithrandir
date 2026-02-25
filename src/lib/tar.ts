import { shell } from "@/lib/shell.js";
import type { AppDefinition } from "@/types.js";
import { getAppDir } from "@/lib/apps.js";

/**
 * Resolve the real (non-root) user and group for file ownership.
 * Uses SUDO_USER + getent when running under sudo, falls back to id.
 */
async function resolveOwnership(): Promise<string> {
  const sudoUser = process.env.SUDO_USER;
  if (sudoUser) {
    // Look up the user's primary group via getent (same pattern as rclone.ts)
    const result = await shell("getent", ["passwd", sudoUser], { ignoreError: true });
    if (result.exitCode === 0 && result.stdout.trim()) {
      const gid = result.stdout.split(":")[3];
      if (gid) {
        const grpResult = await shell("getent", ["group", gid], { ignoreError: true });
        const groupName = grpResult.exitCode === 0 ? grpResult.stdout.split(":")[0] : gid;
        return `${sudoUser}:${groupName}`;
      }
    }
    return `${sudoUser}:${sudoUser}`;
  }

  const { stdout: user } = await shell("id", ["-un"]);
  const { stdout: group } = await shell("id", ["-gn"]);
  return `${user.trim()}:${group.trim()}`;
}

/**
 * Create a zstd-compressed tarball of an app's config.
 * Mirrors backup.sh behavior: archives config dir + docker-compose.yml
 * relative to the app directory so extraction restores the full path.
 */
export async function createBackup(
  app: AppDefinition,
  baseDir: string,
  outputPath: string,
): Promise<void> {
  const appDir = getAppDir(app, baseDir);

  // Build list of paths to include (relative to baseDir)
  const includes: string[] = [];

  if (app.configSubdir === "multiple" && app.multipleConfigDirs) {
    // Homarr: multiple config directories
    for (const dir of app.multipleConfigDirs) {
      includes.push(`${app.name}/${dir}`);
    }
  } else {
    includes.push(`${app.name}/${app.configSubdir}`);
  }

  // Always include docker-compose.yml
  includes.push(`${app.name}/docker-compose.yml`);

  await shell(
    "tar",
    ["--zstd", "-cf", outputPath, "-C", baseDir, ...includes],
    { sudo: true },
  );

  // Fix ownership so non-root user can manage the file
  const ownership = await resolveOwnership();
  await shell("chown", [ownership, outputPath], { sudo: true });
}

/**
 * Create a secrets backup tarball.
 * Includes .env and any other project-root config files that exist.
 */
export async function createSecretsBackup(
  projectRoot: string,
  outputPath: string,
): Promise<void> {
  const files = [".env"];
  const existing: string[] = [];

  for (const file of files) {
    const { exitCode } = await shell("test", ["-f", `${projectRoot}/${file}`], {
      ignoreError: true,
    });
    if (exitCode === 0) existing.push(file);
  }

  if (existing.length === 0) return;

  await shell(
    "tar",
    ["--zstd", "-cf", outputPath, "-C", projectRoot, ...existing],
    { sudo: true },
  );

  const ownership = await resolveOwnership();
  await shell("chown", [ownership, outputPath], { sudo: true });
}

/**
 * Extract a zstd-compressed tarball.
 * @param tarPath Path to the .tar.zst file
 * @param destDir Directory to extract into (usually BASE_DIR for apps, SCRIPT_DIR for secrets)
 */
export async function extractBackup(
  tarPath: string,
  destDir: string,
): Promise<void> {
  await shell("tar", ["--zstd", "-xf", tarPath, "-C", destDir], {
    sudo: true,
  });
}
