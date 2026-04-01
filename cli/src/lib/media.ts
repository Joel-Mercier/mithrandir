import { readdir, stat } from "fs/promises";
import { join, resolve } from "path";

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

export interface FileNode {
  name: string;
  type: "file" | "directory";
  size: number;
  children?: FileNode[];
}

export interface MediaCategoryInfo {
  category: MediaCategory;
  totalSize: number;
  fileCount: number;
  tree: FileNode[];
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

// ─── Helpers ────────────────────────────────────────────────────────

const IGNORED = new Set([".uploads", "@eaDir", ".DS_Store", "Thumbs.db"]);

async function scanDirectory(
  dirPath: string,
  maxDepth: number,
  currentDepth = 0,
): Promise<{ nodes: FileNode[]; totalSize: number; fileCount: number }> {
  let totalSize = 0;
  let fileCount = 0;
  const nodes: FileNode[] = [];

  let rawEntries: import("fs").Dirent[];
  try {
    rawEntries = await readdir(dirPath, { withFileTypes: true, encoding: "utf-8" }) as import("fs").Dirent[];
  } catch {
    return { nodes, totalSize, fileCount };
  }

  // Sort: directories first, then alphabetically
  const entries = [...rawEntries].sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });

  for (const entry of entries) {
    const name = String(entry.name);
    if (IGNORED.has(name) || name.startsWith(".")) continue;

    const fullPath = join(dirPath, name);

    if (entry.isDirectory()) {
      if (currentDepth < maxDepth) {
        const sub = await scanDirectory(fullPath, maxDepth, currentDepth + 1);
        nodes.push({
          name,
          type: "directory",
          size: sub.totalSize,
          children: sub.nodes,
        });
        totalSize += sub.totalSize;
        fileCount += sub.fileCount;
      } else {
        // At max depth, just get directory size summary
        const sub = await getDirectorySize(fullPath);
        nodes.push({
          name,
          type: "directory",
          size: sub.totalSize,
          children: [],
        });
        totalSize += sub.totalSize;
        fileCount += sub.fileCount;
      }
    } else if (entry.isFile()) {
      try {
        const info = await stat(fullPath);
        nodes.push({
          name,
          type: "file",
          size: info.size,
        });
        totalSize += info.size;
        fileCount += 1;
      } catch {
        // Skip files we can't stat
      }
    }
  }

  return { nodes, totalSize, fileCount };
}

async function getDirectorySize(
  dirPath: string,
): Promise<{ totalSize: number; fileCount: number }> {
  let totalSize = 0;
  let fileCount = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true, encoding: "utf-8" }) as import("fs").Dirent[];
    for (const entry of entries) {
      const name = String(entry.name);
      if (IGNORED.has(name) || name.startsWith(".")) continue;
      const fullPath = join(dirPath, name);
      if (entry.isDirectory()) {
        const sub = await getDirectorySize(fullPath);
        totalSize += sub.totalSize;
        fileCount += sub.fileCount;
      } else if (entry.isFile()) {
        try {
          const info = await stat(fullPath);
          totalSize += info.size;
          fileCount += 1;
        } catch {
          // Skip
        }
      }
    }
  } catch {
    // Directory unreadable
  }

  return { totalSize, fileCount };
}

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
