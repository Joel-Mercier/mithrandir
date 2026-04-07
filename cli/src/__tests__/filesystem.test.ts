import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  listDirectory,
  scanDirectory,
  getDirectorySize,
} from "@/lib/filesystem.js";

const TEST_DIR = join(tmpdir(), `mithrandir-fs-test-${Date.now()}`);

beforeAll(() => {
  // Create test directory structure:
  // test-dir/
  //   alpha/
  //     nested/
  //       deep.txt (10 bytes)
  //     file-a.txt (5 bytes)
  //   beta/
  //     file-b.txt (20 bytes)
  //   gamma.txt (15 bytes)
  //   .hidden-dir/
  //     secret.txt (8 bytes)
  //   .hidden-file (3 bytes)
  //   .DS_Store (0 bytes — ignored)
  //   @eaDir/ (ignored)
  mkdirSync(join(TEST_DIR, "alpha", "nested"), { recursive: true });
  mkdirSync(join(TEST_DIR, "beta"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".hidden-dir"), { recursive: true });
  mkdirSync(join(TEST_DIR, "@eaDir"), { recursive: true });

  writeFileSync(join(TEST_DIR, "alpha", "file-a.txt"), "hello"); // 5
  writeFileSync(join(TEST_DIR, "alpha", "nested", "deep.txt"), "0123456789"); // 10
  writeFileSync(join(TEST_DIR, "beta", "file-b.txt"), "01234567890123456789"); // 20
  writeFileSync(join(TEST_DIR, "gamma.txt"), "0123456789abcde"); // 15
  writeFileSync(join(TEST_DIR, ".hidden-dir", "secret.txt"), "12345678"); // 8
  writeFileSync(join(TEST_DIR, ".hidden-file"), "abc"); // 3
  writeFileSync(join(TEST_DIR, ".DS_Store"), "");
  writeFileSync(join(TEST_DIR, "@eaDir", "thumb.jpg"), "fake");
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ─── listDirectory ──────────────────────────────────────────────────────────

describe("listDirectory", () => {
  test("lists visible entries, directories first", async () => {
    const result = await listDirectory(TEST_DIR);
    const names = result.entries.map((e) => e.name);
    // Directories should come first, then files, both sorted alphabetically
    expect(names).toEqual(["alpha", "beta", "gamma.txt"]);
  });

  test("marks types correctly", async () => {
    const result = await listDirectory(TEST_DIR);
    const alpha = result.entries.find((e) => e.name === "alpha");
    const gamma = result.entries.find((e) => e.name === "gamma.txt");
    expect(alpha?.type).toBe("directory");
    expect(gamma?.type).toBe("file");
  });

  test("reports file sizes", async () => {
    const result = await listDirectory(TEST_DIR);
    const gamma = result.entries.find((e) => e.name === "gamma.txt");
    expect(gamma?.size).toBe(15);
  });

  test("directories have size 0", async () => {
    const result = await listDirectory(TEST_DIR);
    const alpha = result.entries.find((e) => e.name === "alpha");
    expect(alpha?.size).toBe(0);
  });

  test("hides dotfiles and ignored names by default", async () => {
    const result = await listDirectory(TEST_DIR);
    const names = result.entries.map((e) => e.name);
    expect(names).not.toContain(".hidden-dir");
    expect(names).not.toContain(".hidden-file");
    expect(names).not.toContain(".DS_Store");
    expect(names).not.toContain("@eaDir");
  });

  test("showHidden includes dotfiles but still skips ignored names", async () => {
    const result = await listDirectory(TEST_DIR, { showHidden: true });
    const names = result.entries.map((e) => e.name);
    expect(names).toContain(".hidden-dir");
    expect(names).toContain(".hidden-file");
    // @eaDir and .DS_Store are in the DEFAULT_IGNORED set
    expect(names).not.toContain("@eaDir");
    expect(names).not.toContain(".DS_Store");
  });

  test("directoriesOnly filters out files", async () => {
    const result = await listDirectory(TEST_DIR, { directoriesOnly: true });
    const types = result.entries.map((e) => e.type);
    expect(types.every((t) => t === "directory")).toBe(true);
    expect(result.entries.map((e) => e.name)).toEqual(["alpha", "beta"]);
  });

  test("returns resolved path", async () => {
    const result = await listDirectory(TEST_DIR);
    expect(result.path).toBe(TEST_DIR);
  });

  test("returns empty entries for non-existent directory", async () => {
    const result = await listDirectory(join(TEST_DIR, "does-not-exist"));
    expect(result.entries).toEqual([]);
  });
});

// ─── scanDirectory ──────────────────────────────────────────────────────────

describe("scanDirectory", () => {
  test("scans full tree with sufficient depth", async () => {
    const result = await scanDirectory(TEST_DIR, 3);
    // Top-level visible: alpha/, beta/, gamma.txt
    expect(result.nodes.length).toBe(3);
    expect(result.fileCount).toBe(4); // file-a, deep, file-b, gamma
    expect(result.totalSize).toBe(5 + 10 + 20 + 15);
  });

  test("directories come before files", async () => {
    const result = await scanDirectory(TEST_DIR, 3);
    const types = result.nodes.map((n) => n.type);
    expect(types).toEqual(["directory", "directory", "file"]);
  });

  test("recurses into subdirectories", async () => {
    const result = await scanDirectory(TEST_DIR, 3);
    const alpha = result.nodes.find((n) => n.name === "alpha");
    expect(alpha?.children?.length).toBe(2); // nested/, file-a.txt
    const nested = alpha?.children?.find((n) => n.name === "nested");
    expect(nested?.children?.length).toBe(1); // deep.txt
  });

  test("directory sizes aggregate children", async () => {
    const result = await scanDirectory(TEST_DIR, 3);
    const alpha = result.nodes.find((n) => n.name === "alpha");
    expect(alpha?.size).toBe(5 + 10); // file-a + deep
  });

  test("respects maxDepth", async () => {
    const result = await scanDirectory(TEST_DIR, 0);
    // At depth 0, subdirectories are scanned for size but have empty children
    const alpha = result.nodes.find((n) => n.name === "alpha");
    expect(alpha?.children).toEqual([]);
    // But sizes should still be calculated
    expect(alpha?.size).toBe(15); // file-a (5) + deep (10)
  });

  test("skips hidden files and ignored names", async () => {
    const result = await scanDirectory(TEST_DIR, 3);
    const names = result.nodes.map((n) => n.name);
    expect(names).not.toContain(".hidden-dir");
    expect(names).not.toContain(".hidden-file");
    expect(names).not.toContain("@eaDir");
    expect(names).not.toContain(".DS_Store");
  });

  test("handles non-existent directory", async () => {
    const result = await scanDirectory(join(TEST_DIR, "nope"), 3);
    expect(result.nodes).toEqual([]);
    expect(result.totalSize).toBe(0);
    expect(result.fileCount).toBe(0);
  });
});

// ─── getDirectorySize ───────────────────────────────────────────────────────

describe("getDirectorySize", () => {
  test("sums all file sizes recursively", async () => {
    const result = await getDirectorySize(TEST_DIR);
    // Only visible files: file-a(5) + deep(10) + file-b(20) + gamma(15) = 50
    expect(result.totalSize).toBe(50);
    expect(result.fileCount).toBe(4);
  });

  test("counts single directory", async () => {
    const result = await getDirectorySize(join(TEST_DIR, "beta"));
    expect(result.totalSize).toBe(20);
    expect(result.fileCount).toBe(1);
  });

  test("returns zero for empty or non-existent directory", async () => {
    const result = await getDirectorySize(join(TEST_DIR, "nope"));
    expect(result.totalSize).toBe(0);
    expect(result.fileCount).toBe(0);
  });

  test("skips hidden and ignored entries", async () => {
    // Total with hidden would be 50 + 8 (secret) + 3 (.hidden-file) + 4 (@eaDir/thumb)
    // But we should only get 50
    const result = await getDirectorySize(TEST_DIR);
    expect(result.totalSize).toBe(50);
  });
});
