import { join, resolve } from "path";
import { scanDirectory } from "./filesystem";

// Re-export FileNode so existing imports from "@mithrandir/cli/lib/media" still work
export type { FileNode } from "./filesystem";

// ─── Types ──────────────────────────────────────────────────────────

export const MEDIA_CATEGORIES = [
  "movies",
  "tv",
  "music",
  "audiobooks",
  "podcasts",
  "pictures",
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export interface MediaCategoryInfo {
  category: MediaCategory;
  totalSize: number;
  fileCount: number;
  tree: import("./filesystem").FileNode[];
}

export interface DiskUsageInfo {
  mountpoint: string;
  totalBytes: number;
  usedBytes: number;
  availBytes: number;
}

export interface MediaLibraryData {
  categories: MediaCategoryInfo[];
  disk: DiskUsageInfo | null;
  mediaDir: string;
}

export type MediaSortField = "name" | "size";
export type MediaSortDirection = "asc" | "desc";

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Scan media directories and return file tree data for each category.
 * @param baseDir - The homelab BASE_DIR from .env
 * @param maxDepth - Maximum directory depth to recurse into (default 3)
 */
export async function scanMediaLibrary(
  baseDir: string,
  maxDepth = 3,
): Promise<MediaCategoryInfo[]> {
  const mediaDir = resolve(baseDir, "data/media");

  const results = await Promise.all(
    MEDIA_CATEGORIES.map(async (category): Promise<MediaCategoryInfo> => {
      const categoryPath = join(mediaDir, category);
      const { nodes, totalSize, fileCount } = await scanDirectory(
        categoryPath,
        maxDepth,
      );
      return { category, totalSize, fileCount, tree: nodes };
    }),
  );

  return results;
}

/**
 * Scan a single media category and return its file tree.
 */
export async function scanMediaCategory(
  baseDir: string,
  category: MediaCategory,
  maxDepth = 4,
): Promise<MediaCategoryInfo> {
  const categoryPath = resolve(baseDir, "data/media", category);
  const { nodes, totalSize, fileCount } = await scanDirectory(
    categoryPath,
    maxDepth,
  );
  return { category, totalSize, fileCount, tree: nodes };
}
