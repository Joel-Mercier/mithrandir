import { describe, expect, test } from "bun:test";
import { Logger, BACKUP_LOG_PATH, RESTORE_LOG_PATH } from "@/lib/logger.js";

describe("Logger", () => {
  test("format() includes timestamp and message", () => {
    const logger = new Logger();
    const result = logger.format("test message");
    // Should match pattern: [YYYY-MM-DD HH:MM:SS] test message
    expect(result).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] test message$/);
  });

  test("format() uses ISO-like timestamp without T or milliseconds", () => {
    const logger = new Logger();
    const result = logger.format("hello");
    // Should NOT contain T or .xxxZ
    expect(result).not.toContain("T");
    expect(result).not.toMatch(/\.\d+Z/);
  });
});

describe("log path constants", () => {
  test("BACKUP_LOG_PATH is /var/log/homelab-backup.log", () => {
    expect(BACKUP_LOG_PATH).toBe("/var/log/homelab-backup.log");
  });

  test("RESTORE_LOG_PATH is /var/log/homelab-restore.log", () => {
    expect(RESTORE_LOG_PATH).toBe("/var/log/homelab-restore.log");
  });
});
