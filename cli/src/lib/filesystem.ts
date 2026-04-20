import { readdir, rm, stat } from "fs/promises";
import { join, relative, resolve } from "path";

// ─── Types ──────────────────────────────────────────────────────────

export interface FileNode {
  name: string;
  type: "file" | "directory";
  size: number;
  children?: FileNode[];
}

export interface DirEntry {
  name: string;
  type: "file" | "directory";
  size: number;
}

export interface ListDirectoryOptions {
  directoriesOnly?: boolean;
  showHidden?: boolean;
  ignoredNames?: Set<string>;
}

export interface ListDirectoryResult {
  path: string;
  entries: DirEntry[];
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_IGNORED = new Set([".uploads", "@eaDir", ".DS_Store", "Thumbs.db"]);

// ─── Single-level listing ───────────────────────────────────────────

/**
 * List the contents of a single directory (no recursion).
 * Used by the directory picker for lazy-loading.
 */
export async function listDirectory(
  dirPath: string,
  options?: ListDirectoryOptions,
): Promise<ListDirectoryResult> {
  const resolvedPath = resolve(dirPath);
  const ignored = options?.ignoredNames ?? DEFAULT_IGNORED;
  const entries: DirEntry[] = [];

  let rawEntries: import("fs").Dirent[];
  try {
    rawEntries = await readdir(resolvedPath, { withFileTypes: true, encoding: "utf-8" }) as import("fs").Dirent[];
  } catch {
    return { path: resolvedPath, entries };
  }

  const sorted = [...rawEntries].sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });

  for (const entry of sorted) {
    const name = String(entry.name);
    if (ignored.has(name)) continue;
    if (!options?.showHidden && name.startsWith(".")) continue;

    if (options?.directoriesOnly && !entry.isDirectory()) continue;

    const fullPath = join(resolvedPath, name);

    if (entry.isDirectory()) {
      entries.push({ name, type: "directory", size: 0 });
    } else if (entry.isFile()) {
      try {
        const info = await stat(fullPath);
        entries.push({ name, type: "file", size: info.size });
      } catch {
        // Skip files we can't stat
      }
    }
  }

  return { path: resolvedPath, entries };
}

// ─── Deep recursive scan ────────────────────────────────────────────

/**
 * Recursively scan a directory tree up to maxDepth.
 * Returns FileNode[] with children, total size, and file count.
 */
export async function scanDirectory(
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

  const entries = [...rawEntries].sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });

  for (const entry of entries) {
    const name = String(entry.name);
    if (DEFAULT_IGNORED.has(name) || name.startsWith(".")) continue;

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

/**
 * Get total size and file count for a directory (no tree structure).
 */
export async function getDirectorySize(
  dirPath: string,
): Promise<{ totalSize: number; fileCount: number }> {
  let totalSize = 0;
  let fileCount = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true, encoding: "utf-8" }) as import("fs").Dirent[];
    for (const entry of entries) {
      const name = String(entry.name);
      if (DEFAULT_IGNORED.has(name) || name.startsWith(".")) continue;
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

// ─── Deletion ───────────────────────────────────────────────────────

export interface DeletePathsResult {
  deleted: string[];
  failed: { path: string; error: string }[];
}

/**
 * Delete a list of files or directories. Each path must resolve inside
 * `sandboxRoot` — any path escaping it (via `..` or symlinks) is rejected.
 * Directories are removed recursively.
 */
export async function deletePaths(
  paths: string[],
  sandboxRoot: string,
): Promise<DeletePathsResult> {
  const resolvedRoot = resolve(sandboxRoot);
  const deleted: string[] = [];
  const failed: { path: string; error: string }[] = [];

  for (const p of paths) {
    const target = resolve(p);
    const rel = relative(resolvedRoot, target);
    if (rel.startsWith("..") || rel === "" || rel.startsWith("/")) {
      failed.push({ path: p, error: "path outside allowed root" });
      continue;
    }
    try {
      await rm(target, { recursive: true, force: true });
      deleted.push(target);
    } catch (err) {
      failed.push({
        path: p,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { deleted, failed };
}
