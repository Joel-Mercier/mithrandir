import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { homedir } from "os";
import type { EnvConfig, BackupConfig } from "@/types.js";

/** Find the project root (where .env / backup.conf live) */
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
  };

  if (!existsSync(envPath)) return defaults;

  const content = await readFile(envPath, "utf-8");
  const parsed = parseKeyValueFile(content);

  return { ...defaults, ...parsed } as EnvConfig;
}

/** Load backup.conf from the project root */
export async function loadBackupConfig(
  projectRoot?: string,
): Promise<BackupConfig> {
  const root = projectRoot ?? getProjectRoot();
  const confPath = resolve(root, "backup.conf");

  // Start with defaults
  const config: BackupConfig = {
    BACKUP_DIR: "/backups",
    LOCAL_RETENTION: 5,
    REMOTE_RETENTION: 10,
    RCLONE_REMOTE: "gdrive",
    APPS: "auto",
    BASE_DIR: homedir(),
  };

  // Try loading .env first for BASE_DIR
  const envConfig = await loadEnvConfig(root);
  if (envConfig.BASE_DIR) config.BASE_DIR = envConfig.BASE_DIR;

  if (!existsSync(confPath)) return config;

  const content = await readFile(confPath, "utf-8");
  const parsed = parseKeyValueFile(content);

  if (parsed.BACKUP_DIR) config.BACKUP_DIR = parsed.BACKUP_DIR;
  if (parsed.LOCAL_RETENTION)
    config.LOCAL_RETENTION = parseInt(parsed.LOCAL_RETENTION, 10);
  if (parsed.REMOTE_RETENTION)
    config.REMOTE_RETENTION = parseInt(parsed.REMOTE_RETENTION, 10);
  if (parsed.RCLONE_REMOTE) config.RCLONE_REMOTE = parsed.RCLONE_REMOTE;
  if (parsed.APPS) config.APPS = parsed.APPS;
  if (parsed.BASE_DIR) config.BASE_DIR = parsed.BASE_DIR;

  return config;
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
