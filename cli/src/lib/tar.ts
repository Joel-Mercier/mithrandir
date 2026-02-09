import { shell } from "./shell.js";
import type { AppDefinition } from "../types.js";
import { getAppDir } from "./apps.js";

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
  const { stdout: user } = await shell("id", ["-un"]);
  const { stdout: group } = await shell("id", ["-gn"]);
  await shell(
    "chown",
    [`${user.trim()}:${group.trim()}`, outputPath],
    { sudo: true },
  );
}

/**
 * Create a secrets backup tarball.
 * Includes .env, setup.sh, backup.sh, restore.sh, backup.conf
 */
export async function createSecretsBackup(
  projectRoot: string,
  outputPath: string,
): Promise<void> {
  const files = [".env", "setup.sh", "backup.sh", "restore.sh", "backup.conf"];
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

  const { stdout: user } = await shell("id", ["-un"]);
  const { stdout: group } = await shell("id", ["-gn"]);
  await shell(
    "chown",
    [`${user.trim()}:${group.trim()}`, outputPath],
    { sudo: true },
  );
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
