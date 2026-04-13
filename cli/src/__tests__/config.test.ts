import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtempSync, rmSync, readFileSync } from "fs";
import { getBackupConfig, loadEnvConfig, saveEnvConfig } from "@/lib/config.js";
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

  test("handles non-numeric retention gracefully", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      LOCAL_RETENTION: "abc",
    };
    const config = getBackupConfig(env);
    expect(config.LOCAL_RETENTION).toBeNaN();
  });

  test("handles empty RCLONE_REMOTES string", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      RCLONE_REMOTES: "",
    };
    const config = getBackupConfig(env);
    expect(config.RCLONE_REMOTES).toEqual(["gdrive"]);
  });

  test("handles RCLONE_REMOTES with only commas", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      RCLONE_REMOTES: ",,,",
    };
    const config = getBackupConfig(env);
    expect(config.RCLONE_REMOTES).toEqual(["gdrive"]);
  });

  test("handles BACKUP_HOUR edge values", () => {
    const env0: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      BACKUP_HOUR: "0",
    };
    expect(getBackupConfig(env0).BACKUP_HOUR).toBe(0);

    const env23: EnvConfig = { ...env0, BACKUP_HOUR: "23" };
    expect(getBackupConfig(env23).BACKUP_HOUR).toBe(23);
  });

  test("BASE_DIR is passed through from env", () => {
    const env: EnvConfig = {
      BASE_DIR: "/custom/path",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
    };
    const config = getBackupConfig(env);
    expect(config.BASE_DIR).toBe("/custom/path");
  });

  test("all fields have expected types", () => {
    const env: EnvConfig = {
      BASE_DIR: "/home/test",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
    };
    const config = getBackupConfig(env);
    expect(typeof config.BACKUP_DIR).toBe("string");
    expect(typeof config.LOCAL_RETENTION).toBe("number");
    expect(typeof config.REMOTE_RETENTION).toBe("number");
    expect(Array.isArray(config.RCLONE_REMOTES)).toBe(true);
    expect(typeof config.APPS).toBe("string");
    expect(typeof config.BASE_DIR).toBe("string");
    expect(typeof config.BACKUP_HOUR).toBe("number");
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

  test("treats empty values as not set (uses defaults)", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "BASE_DIR=/opt/homelab\nBACKUP_PASSWORD=\nBACKUP_DIR=\nAPPS=\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/homelab");
    // Empty values should fall through to defaults
    expect(config.BACKUP_DIR).toBe("/backups");
    expect(config.APPS).toBe("auto");
    // Optional vars with no default should remain undefined
    expect(config.BACKUP_PASSWORD).toBeUndefined();
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

  test("handles values with equals signs", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "RCLONE_GDRIVE_TOKEN={\"access_token\":\"abc==\"}\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.RCLONE_GDRIVE_TOKEN).toBe('{"access_token":"abc=="}');
  });

  test("handles inline comments (value before #)", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "BASE_DIR=/opt/homelab # my homelab\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBeTruthy();
  });

  test("handles multiple empty lines between entries", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "\n\n\nBASE_DIR=/opt/homelab\n\n\nPUID=1001\n\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/homelab");
    expect(config.PUID).toBe("1001");
  });

  test("handles lines without equals sign", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "INVALID_LINE\nBASE_DIR=/opt/homelab\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/homelab");
  });

  test("handles double-quoted values with spaces", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      'TZ="America/New York"\n',
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.TZ).toBe("America/New York");
  });

  test("later values override earlier ones", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "BASE_DIR=/first\nBASE_DIR=/second\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/second");
  });

  test("export keyword with various spacing", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      "export  BASE_DIR=/opt/homelab\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/homelab");
  });

  test("preserves all known config fields", async () => {
    await Bun.write(
      join(tempDir, ".env"),
      [
        "BASE_DIR=/opt/hl",
        "PUID=1001",
        "PGID=1001",
        "TZ=US/Eastern",
        "DUCKDNS_SUBDOMAINS=test",
        "DUCKDNS_TOKEN=abc",
        "ENABLE_HTTPS=true",
        "ENABLE_FIREWALL=true",
        "ENABLE_SSO=true",
        "ACME_EMAIL=a@b.com",
        "BACKUP_DIR=/bk",
        "BACKUP_PASSWORD=secret",
        "BACKUP_HOUR=3",
        "LOCAL_RETENTION=7",
        "REMOTE_RETENTION=14",
        "RCLONE_REMOTES=gdrive,s3",
        "APPS=sonarr,radarr",
      ].join("\n") + "\n",
    );
    const config = await loadEnvConfig(tempDir);
    expect(config.BASE_DIR).toBe("/opt/hl");
    expect(config.DUCKDNS_SUBDOMAINS).toBe("test");
    expect(config.ENABLE_HTTPS).toBe("true");
    expect(config.ENABLE_FIREWALL).toBe("true");
    expect(config.ENABLE_SSO).toBe("true");
    expect(config.ACME_EMAIL).toBe("a@b.com");
    expect(config.BACKUP_PASSWORD).toBe("secret");
    expect(config.BACKUP_HOUR).toBe("3");
    expect(config.RCLONE_REMOTES).toBe("gdrive,s3");
    expect(config.APPS).toBe("sonarr,radarr");
  });
});

describe("saveEnvConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mithrandir-save-test-"));
    Bun.write(join(tempDir, "package.json"), "{}");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("writes KEY=VALUE pairs to .env file", async () => {
    const config: EnvConfig = {
      BASE_DIR: "/opt/homelab",
      PUID: "1001",
      PGID: "1001",
      TZ: "America/New_York",
    };
    await saveEnvConfig(config, tempDir);
    const content = readFileSync(join(tempDir, ".env"), "utf-8");
    expect(content).toContain("BASE_DIR=/opt/homelab");
    expect(content).toContain("PUID=1001");
    expect(content).toContain("PGID=1001");
    expect(content).toContain("TZ=America/New_York");
  });

  test("file ends with newline", async () => {
    const config: EnvConfig = {
      BASE_DIR: "/opt/homelab",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
    };
    await saveEnvConfig(config, tempDir);
    const content = readFileSync(join(tempDir, ".env"), "utf-8");
    expect(content.endsWith("\n")).toBe(true);
  });

  test("omits undefined values", async () => {
    const config: EnvConfig = {
      BASE_DIR: "/opt/homelab",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      BACKUP_PASSWORD: undefined,
    };
    await saveEnvConfig(config, tempDir);
    const content = readFileSync(join(tempDir, ".env"), "utf-8");
    expect(content).not.toContain("BACKUP_PASSWORD");
  });

  test("includes optional values when set", async () => {
    const config: EnvConfig = {
      BASE_DIR: "/opt/homelab",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
      BACKUP_PASSWORD: "secret123",
      DUCKDNS_SUBDOMAINS: "mylab",
    };
    await saveEnvConfig(config, tempDir);
    const content = readFileSync(join(tempDir, ".env"), "utf-8");
    expect(content).toContain("BACKUP_PASSWORD=secret123");
    expect(content).toContain("DUCKDNS_SUBDOMAINS=mylab");
  });

  test("round-trip: save then load preserves values", async () => {
    const config: EnvConfig = {
      BASE_DIR: "/opt/homelab",
      PUID: "1001",
      PGID: "1001",
      TZ: "America/Chicago",
      BACKUP_DIR: "/mnt/backups",
      LOCAL_RETENTION: "7",
      REMOTE_RETENTION: "14",
    };
    await saveEnvConfig(config, tempDir);
    const loaded = await loadEnvConfig(tempDir);
    expect(loaded.BASE_DIR).toBe("/opt/homelab");
    expect(loaded.PUID).toBe("1001");
    expect(loaded.PGID).toBe("1001");
    expect(loaded.TZ).toBe("America/Chicago");
    expect(loaded.BACKUP_DIR).toBe("/mnt/backups");
    expect(loaded.LOCAL_RETENTION).toBe("7");
    expect(loaded.REMOTE_RETENTION).toBe("14");
  });

  test("overwrites existing .env file", async () => {
    const first: EnvConfig = {
      BASE_DIR: "/first",
      PUID: "1000",
      PGID: "1000",
      TZ: "Etc/UTC",
    };
    await saveEnvConfig(first, tempDir);

    const second: EnvConfig = {
      BASE_DIR: "/second",
      PUID: "2000",
      PGID: "2000",
      TZ: "Asia/Tokyo",
    };
    await saveEnvConfig(second, tempDir);

    const content = readFileSync(join(tempDir, ".env"), "utf-8");
    expect(content).toContain("BASE_DIR=/second");
    expect(content).not.toContain("BASE_DIR=/first");
  });
});
