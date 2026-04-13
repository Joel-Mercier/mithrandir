import { describe, expect, test } from "bun:test";
import { isEncryptedBackup } from "@/lib/crypto.js";
import { ENCRYPTED_EXT, ARCHIVE_EXT } from "@/lib/backup-utils.js";

describe("isEncryptedBackup", () => {
  test("returns true for .tar.zst.enc files", () => {
    expect(isEncryptedBackup("/backups/2024-01-01/sonarr.tar.zst.enc")).toBe(
      true,
    );
  });

  test("returns false for .tar.zst files", () => {
    expect(isEncryptedBackup("/backups/2024-01-01/sonarr.tar.zst")).toBe(false);
  });

  test("returns false for other extensions", () => {
    expect(isEncryptedBackup("/backups/sonarr.zip")).toBe(false);
    expect(isEncryptedBackup("/backups/sonarr.enc")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isEncryptedBackup("")).toBe(false);
  });

  test("detects encrypted backup with full path", () => {
    expect(isEncryptedBackup("/backups/archive/2024-01-01/sonarr.tar.zst.enc")).toBe(true);
  });

  test("rejects just the extension", () => {
    expect(isEncryptedBackup(ENCRYPTED_EXT)).toBe(true);
    expect(isEncryptedBackup(ARCHIVE_EXT)).toBe(false);
  });

  test("rejects similar but wrong extensions", () => {
    expect(isEncryptedBackup("sonarr.tar.zst.encrypted")).toBe(false);
    expect(isEncryptedBackup("sonarr.tar.zst.enc.bak")).toBe(false);
    expect(isEncryptedBackup("sonarr.enc")).toBe(false);
    expect(isEncryptedBackup("sonarr.tar.enc")).toBe(false);
  });

  test("handles secrets backup", () => {
    expect(isEncryptedBackup("secrets.tar.zst.enc")).toBe(true);
    expect(isEncryptedBackup("secrets.tar.zst")).toBe(false);
  });

  test("handles app names with hyphens", () => {
    expect(isEncryptedBackup("home-assistant.tar.zst.enc")).toBe(true);
    expect(isEncryptedBackup("uptime-kuma.tar.zst.enc")).toBe(true);
  });

  test("case sensitive", () => {
    expect(isEncryptedBackup("sonarr.TAR.ZST.ENC")).toBe(false);
    expect(isEncryptedBackup("sonarr.tar.zst.ENC")).toBe(false);
  });
});
