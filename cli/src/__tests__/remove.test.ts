import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getAppDataDirs } from "@/lib/remove.js";

const TEST_DIR = join(tmpdir(), `mithrandir-remove-test-${Date.now()}`);

beforeAll(() => {
  // Create test directory structure:
  // test-dir/
  //   sonarr/           (app directory)
  //   radarr/           (app directory)
  //   prowlarr/         (app directory)
  //   mithrandir/       (should be excluded)
  //   .hidden/          (should be excluded)
  //   some-file.txt     (regular file, not a directory — excluded)
  mkdirSync(join(TEST_DIR, "sonarr"), { recursive: true });
  mkdirSync(join(TEST_DIR, "radarr"), { recursive: true });
  mkdirSync(join(TEST_DIR, "prowlarr"), { recursive: true });
  mkdirSync(join(TEST_DIR, "mithrandir"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".hidden"), { recursive: true });
  writeFileSync(join(TEST_DIR, "some-file.txt"), "not a directory");
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("getAppDataDirs", () => {
  test("returns app directories", () => {
    const dirs = getAppDataDirs(TEST_DIR);
    expect(dirs).toContain("sonarr");
    expect(dirs).toContain("radarr");
    expect(dirs).toContain("prowlarr");
  });

  test("excludes mithrandir directory", () => {
    const dirs = getAppDataDirs(TEST_DIR);
    expect(dirs).not.toContain("mithrandir");
  });

  test("excludes hidden directories", () => {
    const dirs = getAppDataDirs(TEST_DIR);
    expect(dirs).not.toContain(".hidden");
  });

  test("excludes regular files", () => {
    const dirs = getAppDataDirs(TEST_DIR);
    expect(dirs).not.toContain("some-file.txt");
  });

  test("returns empty array for non-existent directory", () => {
    const dirs = getAppDataDirs(join(TEST_DIR, "does-not-exist"));
    expect(dirs).toEqual([]);
  });

  test("returns empty array for empty directory", () => {
    const emptyDir = join(TEST_DIR, "empty-test");
    mkdirSync(emptyDir, { recursive: true });
    const dirs = getAppDataDirs(emptyDir);
    expect(dirs).toEqual([]);
    rmSync(emptyDir, { recursive: true, force: true });
  });
});
