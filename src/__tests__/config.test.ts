import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtempSync, rmSync } from "fs";
import { getBackupConfig, loadEnvConfig } from "@/lib/config.js";
import type { EnvConfig } from "@/types.js";

describe("getBackupConfig", () => {
  test("parses retention values as numbers", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      LOCAL_RETENTION: "7",
      REMOTE_RETENTION: "14",
    };
    const config = getBackupConfig(env);
    expect(config.LOCAL_RETENTION).toBe(7);
    expect(config.REMOTE_RETENTION).toBe(14);
  });

  test("uses defaults for missing values", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
    };
    const config = getBackupConfig(env);
    expect(config.BACKUP_DIR).toBe("/backups");
    expect(config.LOCAL_RETENTION).toBe(5);
    expect(config.REMOTE_RETENTION).toBe(10);
    expect(config.RCLONE_REMOTES).toEqual(["gdrive"]);
    expect(config.APPS).toBe("auto");
  });

  test("parses RCLONE_REMOTES comma-separated", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      RCLONE_REMOTES: "gdrive, my-s3",
    };
    const config = getBackupConfig(env);
    expect(config.RCLONE_REMOTES).toEqual(["gdrive", "my-s3"]);
  });

  test("RCLONE_REMOTES with whitespace is trimmed", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      RCLONE_REMOTES: "  gdrive ,  sftp-backup  ",
    };
    const config = getBackupConfig(env);
    expect(config.RCLONE_REMOTES).toEqual(["gdrive", "sftp-backup"]);
  });

  test("legacy RCLONE_REMOTE wraps in array", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      RCLONE_REMOTE: "my-drive",
    };
    const config = getBackupConfig(env);
    expect(config.RCLONE_REMOTES).toEqual(["my-drive"]);
  });

  test("RCLONE_REMOTES takes precedence over RCLONE_REMOTE", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      RCLONE_REMOTE: "old-drive",
      RCLONE_REMOTES: "new-drive,s3-backup",
    };
    const config = getBackupConfig(env);
    expect(config.RCLONE_REMOTES).toEqual(["new-drive", "s3-backup"]);
  });

  test("handles missing BACKUP_PASSWORD as undefined", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
    };
    const config = getBackupConfig(env);
    expect(config.BACKUP_PASSWORD).toBeUndefined();
  });

  test("includes BACKUP_PASSWORD when set", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      BACKUP_PASSWORD: "secret123",
    };
    const config = getBackupConfig(env);
    expect(config.BACKUP_PASSWORD).toBe("secret123");
  });

  test("defaults BACKUP_HOUR to 2", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
    };
    const config = getBackupConfig(env);
    expect(config.BACKUP_HOUR).toBe(2);
  });

  test("parses BACKUP_HOUR when set", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      BACKUP_HOUR: "5",
    };
    const config = getBackupConfig(env);
    expect(config.BACKUP_HOUR).toBe(5);
  });
});

describe("loadEnvConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mithrandir-test-"));
    // loadEnvConfig looks for package.json to find root, so create one
    Bun.write(join(tempDir, "package.json"), "{}");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("returns defaults when no .env file exists", async () => {
    const config = await loadEnvConfig(tempDir);
    expect(config.PUID).toBe("1000");
    expect(config.PGID).toBe("1000");
    expect(config.TZ).toBe("Etc/UTC");
    expect(config.BACKUP_DIR).toBe("/backups");
    expect(config.APPS).toBe("auto");
  });

  test("parses KEY=VALUE pairs", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "BASE_DIR=/opt/homelab\nPUID=1001\nPGID=1001\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/homelab");
    expect(config.PUID).toBe("1001");
    expect(config.PGID).toBe("1001");
  });

  test("handles quoted values", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      'BASE_DIR="/opt/my homelab"\nTZ=\'America/New_York\'\n',
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/my homelab");
    expect(config.TZ).toBe("America/New_York");
  });

  test("handles export prefix", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "export BASE_DIR=/opt/homelab\nexport TZ=America/Chicago\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/homelab");
    expect(config.TZ).toBe("America/Chicago");
  });

  test("skips comments and empty lines", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "# This is a comment\n\nBASE_DIR=/opt/homelab\n# Another comment\nPUID=1001\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/homelab");
    expect(config.PUID).toBe("1001");
  });
});
