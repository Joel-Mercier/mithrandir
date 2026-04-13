import { describe, expect, test } from "bun:test";
import { Logger, createBackupLogger, createRestoreLogger, BACKUP_LOG_PATH, RESTORE_LOG_PATH } from "@/lib/logger.js";

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

describe("Logger format edge cases", () => {
  test("consecutive calls produce valid timestamps", () => {
    const logger = new Logger();
    const r1 = logger.format("first");
    const r2 = logger.format("second");
    expect(r1).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] first$/);
    expect(r2).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] second$/);
  });

  test("handles empty message", () => {
    const logger = new Logger();
    const result = logger.format("");
    expect(result).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] $/);
  });

  test("handles message with special characters", () => {
    const logger = new Logger();
    const result = logger.format("hello [world] (test) {brace}");
    expect(result).toContain("hello [world] (test) {brace}");
    expect(result).toMatch(/^\[/);
  });

  test("handles multiline messages", () => {
    const logger = new Logger();
    const result = logger.format("line1\nline2");
    expect(result).toContain("line1\nline2");
  });
});

describe("createBackupLogger", () => {
  test("returns a Logger instance", () => {
    const logger = createBackupLogger();
    expect(logger).toBeInstanceOf(Logger);
  });
});

describe("createRestoreLogger", () => {
  test("returns a Logger instance", () => {
    const logger = createRestoreLogger();
    expect(logger).toBeInstanceOf(Logger);
  });
});
