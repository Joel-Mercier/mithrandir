import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { homedir } from "os";
import type { EnvConfig, BackupConfig } from "@/types.js";

/** Find the project root (where .env lives) */
export function getProjectRoot(): string {
  // Walk up until we find the directory containing cli/package.json.
  // Works from both source (cli/src/lib/) and bundled (cli/dist/) locations.
  let dir = dirname(new URL(import.meta.url).pathname);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "cli", "package.json"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("Could not find mithrandir project root");
}

/** Parse a KEY=VALUE file (handles quoting and comments) */
function parseKeyValueFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // Handle export prefix
    const cleaned = trimmed.replace(/^export\s+/, "");
    const eqIdx = cleaned.indexOf("=");
    if (eqIdx === -1) continue;
    const key = cleaned.slice(0, eqIdx).trim();
    let value = cleaned.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** Load .env file from the project root */
export async function loadEnvConfig(
  projectRoot?: string,
): Promise<EnvConfig> {
  const root = projectRoot ?? getProjectRoot();
  const envPath = resolve(root, ".env");

  const defaults: EnvConfig = {
    BASE_DIR: homedir(),
    PUID: "1000",
    PGID: "1000",
    TZ: "Etc/UTC",
    BACKUP_DIR: "/backups",
    LOCAL_RETENTION: "5",
    REMOTE_RETENTION: "10",
    RCLONE_REMOTE: "gdrive",
    APPS: "auto",
  };

  if (!existsSync(envPath)) return defaults;

  const content = await readFile(envPath, "utf-8");
  const parsed = parseKeyValueFile(content);

  return { ...defaults, ...parsed } as EnvConfig;
}

/**
 * Extract and parse backup-related fields from an EnvConfig.
 * Returns a BackupConfig with typed number fields for retention values.
 */
export function getBackupConfig(env: EnvConfig): BackupConfig {
  return {
    BACKUP_DIR: env.BACKUP_DIR ?? "/backups",
    LOCAL_RETENTION: parseInt(env.LOCAL_RETENTION ?? "5", 10),
    REMOTE_RETENTION: parseInt(env.REMOTE_RETENTION ?? "10", 10),
    RCLONE_REMOTE: env.RCLONE_REMOTE ?? "gdrive",
    APPS: env.APPS ?? "auto",
    BASE_DIR: env.BASE_DIR,
  };
}

/** Save .env file */
export async function saveEnvConfig(
  config: EnvConfig,
  projectRoot?: string,
): Promise<void> {
  const root = projectRoot ?? getProjectRoot();
  const envPath = resolve(root, ".env");

  const lines: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) {
      lines.push(`${key}=${value}`);
    }
  }

  await Bun.write(envPath, lines.join("\n") + "\n");
}
