import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  MEDIA_CATEGORIES,
  scanMediaLibrary,
  scanMediaCategory,
} from "@/lib/media.js";

const TEST_DIR = join(tmpdir(), `mithrandir-media-test-${Date.now()}`);
const DATA_DIR = join(TEST_DIR, "data", "media");

beforeAll(() => {
  // Create test media directory structure:
  // test-dir/data/media/
  //   movies/
  //     movie-a/
  //       movie-a.mkv (100 bytes)
  //     movie-b/
  //       movie-b.mp4 (200 bytes)
  //   tv/
  //     show-a/
  //       season1/
  //         ep01.mkv (50 bytes)
  //   music/
  //     artist/
  //       album/
  //         track.flac (80 bytes)
  //   audiobooks/ (empty)
  //   podcasts/   (empty)
  //   pictures/
  //     photo.jpg (30 bytes)

  mkdirSync(join(DATA_DIR, "movies", "movie-a"), { recursive: true });
  mkdirSync(join(DATA_DIR, "movies", "movie-b"), { recursive: true });
  mkdirSync(join(DATA_DIR, "tv", "show-a", "season1"), { recursive: true });
  mkdirSync(join(DATA_DIR, "music", "artist", "album"), { recursive: true });
  mkdirSync(join(DATA_DIR, "audiobooks"), { recursive: true });
  mkdirSync(join(DATA_DIR, "podcasts"), { recursive: true });
  mkdirSync(join(DATA_DIR, "pictures"), { recursive: true });

  writeFileSync(join(DATA_DIR, "movies", "movie-a", "movie-a.mkv"), "x".repeat(100));
  writeFileSync(join(DATA_DIR, "movies", "movie-b", "movie-b.mp4"), "x".repeat(200));
  writeFileSync(join(DATA_DIR, "tv", "show-a", "season1", "ep01.mkv"), "x".repeat(50));
  writeFileSync(join(DATA_DIR, "music", "artist", "album", "track.flac"), "x".repeat(80));
  writeFileSync(join(DATA_DIR, "pictures", "photo.jpg"), "x".repeat(30));
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("MEDIA_CATEGORIES", () => {
  test("has exactly 6 categories", () => {
    expect(MEDIA_CATEGORIES).toHaveLength(6);
  });

  test("includes expected categories", () => {
    expect(MEDIA_CATEGORIES).toContain("movies");
    expect(MEDIA_CATEGORIES).toContain("tv");
    expect(MEDIA_CATEGORIES).toContain("music");
    expect(MEDIA_CATEGORIES).toContain("audiobooks");
    expect(MEDIA_CATEGORIES).toContain("podcasts");
    expect(MEDIA_CATEGORIES).toContain("pictures");
  });
});

describe("scanMediaLibrary", () => {
  test("returns info for all categories", async () => {
    const results = await scanMediaLibrary(TEST_DIR);
    expect(results).toHaveLength(MEDIA_CATEGORIES.length);

    const names = results.map((r) => r.category);
    expect(names).toContain("movies");
    expect(names).toContain("tv");
    expect(names).toContain("music");
    expect(names).toContain("pictures");
  });

  test("movies category has correct file count and size", async () => {
    const results = await scanMediaLibrary(TEST_DIR);
    const movies = results.find((r) => r.category === "movies")!;
    expect(movies.fileCount).toBe(2); // movie-a.mkv + movie-b.mp4
    expect(movies.totalSize).toBe(300);
  });

  test("tv category detects nested files", async () => {
    const results = await scanMediaLibrary(TEST_DIR);
    const tv = results.find((r) => r.category === "tv")!;
    expect(tv.fileCount).toBe(1);
    expect(tv.totalSize).toBe(50);
  });

  test("empty categories have zero size and count", async () => {
    const results = await scanMediaLibrary(TEST_DIR);
    const audiobooks = results.find((r) => r.category === "audiobooks")!;
    expect(audiobooks.fileCount).toBe(0);
    expect(audiobooks.totalSize).toBe(0);
    expect(audiobooks.tree).toEqual([]);
  });

  test("pictures category counts files correctly", async () => {
    const results = await scanMediaLibrary(TEST_DIR);
    const pictures = results.find((r) => r.category === "pictures")!;
    expect(pictures.fileCount).toBe(1);
    expect(pictures.totalSize).toBe(30);
  });

  test("handles non-existent base directory gracefully", async () => {
    const results = await scanMediaLibrary("/tmp/does-not-exist-12345");
    for (const result of results) {
      expect(result.fileCount).toBe(0);
      expect(result.totalSize).toBe(0);
    }
  });
});

describe("scanMediaCategory", () => {
  test("scans a single category", async () => {
    const result = await scanMediaCategory(TEST_DIR, "movies");
    expect(result.category).toBe("movies");
    expect(result.fileCount).toBe(2);
    expect(result.totalSize).toBe(300);
  });

  test("returns directory tree nodes", async () => {
    const result = await scanMediaCategory(TEST_DIR, "movies");
    const dirNames = result.tree.map((n) => n.name);
    expect(dirNames).toContain("movie-a");
    expect(dirNames).toContain("movie-b");
  });

  test("scans music with nested structure", async () => {
    const result = await scanMediaCategory(TEST_DIR, "music");
    expect(result.fileCount).toBe(1);
    expect(result.totalSize).toBe(80);
    // Should have artist directory at top level
    expect(result.tree.length).toBe(1);
    expect(result.tree[0].name).toBe("artist");
  });

  test("empty category returns zero values", async () => {
    const result = await scanMediaCategory(TEST_DIR, "podcasts");
    expect(result.fileCount).toBe(0);
    expect(result.totalSize).toBe(0);
    expect(result.tree).toEqual([]);
  });
});
