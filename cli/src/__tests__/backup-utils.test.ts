import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  ARCHIVE_EXT,
  ENCRYPTED_EXT,
  stripArchiveSuffix,
  isBackupArchive,
  getArchiveFilename,
  findArchiveFile,
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

// ─── findArchiveFile ──────────────────────────────────────────────────────────

const TEST_DIR = join(tmpdir(), `mithrandir-backup-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(join(TEST_DIR, "with-both"), { recursive: true });
  mkdirSync(join(TEST_DIR, "plain-only"), { recursive: true });
  mkdirSync(join(TEST_DIR, "enc-only"), { recursive: true });
  mkdirSync(join(TEST_DIR, "empty"), { recursive: true });

  writeFileSync(join(TEST_DIR, "with-both", `sonarr${ARCHIVE_EXT}`), "plain");
  writeFileSync(join(TEST_DIR, "with-both", `sonarr${ENCRYPTED_EXT}`), "enc");
  writeFileSync(join(TEST_DIR, "plain-only", `radarr${ARCHIVE_EXT}`), "plain");
  writeFileSync(join(TEST_DIR, "enc-only", `jellyfin${ENCRYPTED_EXT}`), "enc");
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("findArchiveFile", () => {
  test("prefers encrypted file when both exist", () => {
    const result = findArchiveFile(join(TEST_DIR, "with-both"), "sonarr");
    expect(result).toBe(join(TEST_DIR, "with-both", `sonarr${ENCRYPTED_EXT}`));
  });

  test("returns plain file when only plain exists", () => {
    const result = findArchiveFile(join(TEST_DIR, "plain-only"), "radarr");
    expect(result).toBe(join(TEST_DIR, "plain-only", `radarr${ARCHIVE_EXT}`));
  });

  test("returns encrypted file when only encrypted exists", () => {
    const result = findArchiveFile(join(TEST_DIR, "enc-only"), "jellyfin");
    expect(result).toBe(join(TEST_DIR, "enc-only", `jellyfin${ENCRYPTED_EXT}`));
  });

  test("returns null when no archive exists for app", () => {
    const result = findArchiveFile(join(TEST_DIR, "empty"), "sonarr");
    expect(result).toBeNull();
  });

  test("returns null for non-existent directory", () => {
    const result = findArchiveFile(join(TEST_DIR, "nope"), "sonarr");
    expect(result).toBeNull();
  });

  test("returns null when different app name", () => {
    const result = findArchiveFile(join(TEST_DIR, "plain-only"), "sonarr");
    expect(result).toBeNull();
  });
});

describe("stripArchiveSuffix additional cases", () => {
  test("handles app names with dots", () => {
    expect(stripArchiveSuffix("home.assistant.tar.zst")).toBe("home.assistant");
  });

  test("handles secrets name", () => {
    expect(stripArchiveSuffix("secrets.tar.zst")).toBe("secrets");
  });
});

describe("isBackupArchive additional cases", () => {
  test("rejects files ending with partial suffix", () => {
    expect(isBackupArchive("sonarr.tar.zs")).toBe(false);
    expect(isBackupArchive("sonarr.tar.zst.en")).toBe(false);
  });
});

describe("getArchiveFilename additional cases", () => {
  test("handles single character app name", () => {
    expect(getArchiveFilename("x", false)).toBe(`x${ARCHIVE_EXT}`);
    expect(getArchiveFilename("x", true)).toBe(`x${ENCRYPTED_EXT}`);
  });

  test("handles secrets archive name", () => {
    expect(getArchiveFilename("secrets", false)).toBe(`secrets${ARCHIVE_EXT}`);
  });
});
