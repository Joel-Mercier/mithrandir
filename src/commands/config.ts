import { resolve } from "path";
import { getProjectRoot, loadEnvConfig, getBackupConfig } from "@/lib/config.js";

export async function runConfig(): Promise<void> {
  const root = getProjectRoot();
  const env = await loadEnvConfig(root);
  const backup = getBackupConfig(env);

  const envPath = resolve(root, ".env");

  console.log(`\n  Configuration (.env)`);
  console.log(`  ${envPath}\n`);
  const pad = 28;

  // Core settings
  console.log(`  ${"BASE_DIR".padEnd(pad)}${env.BASE_DIR}`);
  console.log(`  ${"PUID".padEnd(pad)}${env.PUID}`);
  console.log(`  ${"PGID".padEnd(pad)}${env.PGID}`);
  console.log(`  ${"TZ".padEnd(pad)}${env.TZ}`);

  // Show any extra keys (secrets, app-specific vars)
  const coreKeys = new Set([
    "BASE_DIR", "PUID", "PGID", "TZ",
    "BACKUP_DIR", "LOCAL_RETENTION", "REMOTE_RETENTION", "RCLONE_REMOTE", "APPS",
  ]);
  const extras = Object.entries(env).filter(([k]) => !coreKeys.has(k));
  for (const [key, value] of extras) {
    const masked = key.toLowerCase().includes("token") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("password")
      ? "****"
      : value;
    console.log(`  ${key.padEnd(pad)}${masked}`);
  }

  // Backup settings
  console.log(`\n  Backup Settings\n`);
  console.log(`  ${"BACKUP_DIR".padEnd(pad)}${backup.BACKUP_DIR}`);
  console.log(`  ${"LOCAL_RETENTION".padEnd(pad)}${backup.LOCAL_RETENTION}`);
  console.log(`  ${"REMOTE_RETENTION".padEnd(pad)}${backup.REMOTE_RETENTION}`);
  console.log(`  ${"RCLONE_REMOTE".padEnd(pad)}${backup.RCLONE_REMOTE}`);
  console.log(`  ${"APPS".padEnd(pad)}${backup.APPS}`);
  const hourStr = String(backup.BACKUP_HOUR).padStart(2, "0");
  console.log(`  ${"BACKUP_HOUR".padEnd(pad)}${hourStr}:00`);
  console.log("");
}
