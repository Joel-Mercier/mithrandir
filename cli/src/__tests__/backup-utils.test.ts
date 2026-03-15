import { describe, expect, test } from "bun:test";
import {
  ARCHIVE_EXT,
  ENCRYPTED_EXT,
  stripArchiveSuffix,
  isBackupArchive,
  getArchiveFilename,
} from "@/lib/backup-utils.js";

describe("stripArchiveSuffix", () => {
  test("strips .tar.zst suffix", () => {
    expect(stripArchiveSuffix("sonarr.tar.zst")).toBe("sonarr");
  });

  test("strips .tar.zst.enc suffix", () => {
    expect(stripArchiveSuffix("sonarr.tar.zst.enc")).toBe("sonarr");
  });

  test("returns filename unchanged when no matching suffix", () => {
    expect(stripArchiveSuffix("sonarr.zip")).toBe("sonarr.zip");
  });

  test("handles empty string", () => {
    expect(stripArchiveSuffix("")).toBe("");
  });

  test("prefers encrypted suffix when both could match", () => {
    // .tar.zst.enc ends with .tar.zst.enc, so encrypted branch runs first
    const result = stripArchiveSuffix("app.tar.zst.enc");
    expect(result).toBe("app");
  });
});

describe("isBackupArchive", () => {
  test("recognizes .tar.zst files", () => {
    expect(isBackupArchive("sonarr.tar.zst")).toBe(true);
  });

  test("recognizes .tar.zst.enc files", () => {
    expect(isBackupArchive("sonarr.tar.zst.enc")).toBe(true);
  });

  test("rejects other extensions", () => {
    expect(isBackupArchive("sonarr.zip")).toBe(false);
    expect(isBackupArchive("sonarr.tar.gz")).toBe(false);
    expect(isBackupArchive("sonarr.tar")).toBe(false);
  });

  test("rejects plain filenames", () => {
    expect(isBackupArchive("sonarr")).toBe(false);
  });
});

describe("getArchiveFilename", () => {
  test("returns unencrypted filename", () => {
    expect(getArchiveFilename("sonarr", false)).toBe(`sonarr${ARCHIVE_EXT}`);
  });

  test("returns encrypted filename", () => {
    expect(getArchiveFilename("sonarr", true)).toBe(`sonarr${ENCRYPTED_EXT}`);
  });

  test("handles app names with hyphens", () => {
    expect(getArchiveFilename("home-assistant", false)).toBe(
      `home-assistant${ARCHIVE_EXT}`,
    );
  });
});

describe("constants", () => {
  test("ARCHIVE_EXT is .tar.zst", () => {
    expect(ARCHIVE_EXT).toBe(".tar.zst");
  });

  test("ENCRYPTED_EXT is .tar.zst.enc", () => {
    expect(ENCRYPTED_EXT).toBe(".tar.zst.enc");
  });
});
