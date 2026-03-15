import { describe, expect, test } from "bun:test";
import { isEncryptedBackup } from "@/lib/crypto.js";

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
});
