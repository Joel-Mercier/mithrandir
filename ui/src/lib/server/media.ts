import uFuzzy from "@leeoniya/ufuzzy";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import type {
	DiskUsageInfo,
	FileNode,
	MediaCategory,
	MediaLibraryData,
	MediaSortDirection,
	MediaSortField,
} from "@mithrandir/cli/lib/media";
import { MEDIA_CATEGORIES, scanMediaCategory, scanMediaLibrary } from "@mithrandir/cli/lib/media";
import { deletePaths } from "@mithrandir/cli/lib/filesystem";
import { shell } from "@mithrandir/cli/lib/shell";
import { createServerFn } from "@tanstack/react-start";
import { existsSync } from "fs";
import { resolve } from "path";
import { ensureSession } from "#/lib/auth";
import { logActivity } from "#/lib/server/activity";
import { getProjectRoot } from "./utils";

// ─── Helpers ────────────────────────────────────────────────────────

async function getMediaDiskUsage(mediaDir: string): Promise<DiskUsageInfo | null> {
	if (!existsSync(mediaDir)) return null;

	const dfResult = await shell(
		"df",
		["-B1", "--output=source,size,used,avail,target", mediaDir],
		{ ignoreError: true, timeout: 5000 },
	);
	if (dfResult.exitCode !== 0 || !dfResult.stdout.trim()) return null;

	const lines = dfResult.stdout.trim().split("\n").slice(1);
	if (lines.length === 0) return null;

	const parts = lines[0].trim().split(/\s+/);
	if (parts.length < 5) return null;

	const [, totalStr, usedStr, availStr, ...targetParts] = parts;
	return {
		mountpoint: targetParts.join(" "),
		totalBytes: parseInt(totalStr, 10),
		usedBytes: parseInt(usedStr, 10),
		availBytes: parseInt(availStr, 10),
	};
}

// ─── Server functions ───────────────────────────────────────────────

export const fetchMediaLibrary = createServerFn({ method: "GET" }).handler(
	async (): Promise<MediaLibraryData> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;
		const mediaDir = resolve(baseDir, "data/media");

		const [categories, disk] = await Promise.all([
			scanMediaLibrary(baseDir, 3),
			getMediaDiskUsage(mediaDir),
		]);

		return { categories, disk, mediaDir };
	},
);

export const fetchMediaCategory = createServerFn({ method: "GET" })
	.inputValidator((d: { category: string; search?: string; sortBy?: MediaSortField; sortDirection?: MediaSortDirection }) => d)
	.handler(async ({ data }): Promise<MediaLibraryData> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;
		const mediaDir = resolve(baseDir, "data/media");

		const category = data.category as MediaCategory;
		if (!MEDIA_CATEGORIES.includes(category)) {
			throw new Error(`Invalid media category: ${data.category}`);
		}

		const [categoryInfo, disk] = await Promise.all([
			scanMediaCategory(baseDir, category, 4),
			getMediaDiskUsage(mediaDir),
		]);

		let tree = categoryInfo.tree;

		// Apply fuzzy search filtering
		if (data.search?.trim()) {
			tree = filterTreeBySearch(tree, data.search.trim());
		}

		// Apply sorting
		if (data.sortBy) {
			tree = sortTree(tree, data.sortBy, data.sortDirection ?? "asc");
		}

		return {
			categories: [{ ...categoryInfo, tree }],
			disk,
			mediaDir,
		};
	});

export const deleteMediaFiles = createServerFn({ method: "POST" })
	.inputValidator((d: { paths: string[] }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const mediaDir = resolve(envConfig.BASE_DIR, "data/media");

		const result = await deletePaths(data.paths, mediaDir);

		if (result.deleted.length > 0) {
			const label =
				result.deleted.length === 1
					? result.deleted[0].replace(`${mediaDir}/`, "")
					: `${result.deleted.length} items`;
			try {
				await logActivity("media_deleted", "media", label, "/media-library");
			} catch (err) {
				console.error("Failed to log media deletion activity:", err);
			}
		}

		return result;
	});

// ─── Search & Sort helpers ─────────────────────────────────────────

const uf = new uFuzzy({ intraMode: 1, intraIns: 1 });

/** Collect all file/directory names from a tree into a flat list with paths back to nodes */
function collectNames(nodes: FileNode[]): { name: string; node: FileNode; parents: FileNode[] }[] {
	const result: { name: string; node: FileNode; parents: FileNode[] }[] = [];

	function walk(items: FileNode[], parents: FileNode[]) {
		for (const node of items) {
			result.push({ name: node.name, node, parents: [...parents] });
			if (node.children) {
				walk(node.children, [...parents, node]);
			}
		}
	}
	walk(nodes, []);
	return result;
}

/** Filter the tree to only include nodes whose names fuzzy-match the query, preserving parent paths */
function filterTreeBySearch(tree: FileNode[], query: string): FileNode[] {
	const entries = collectNames(tree);
	const haystack = entries.map((e) => e.name);

	const idxs = uf.filter(haystack, query);
	if (!idxs || idxs.length === 0) return [];

	// Rank results for better ordering
	const info = uf.info(idxs, haystack, query);
	const order = uf.sort(info, haystack, query);

	// Collect all matched nodes and their ancestors
	const matchedNodes = new Set<FileNode>();
	for (const i of order) {
		const entry = entries[idxs[i]];
		matchedNodes.add(entry.node);
		for (const parent of entry.parents) {
			matchedNodes.add(parent);
		}
	}

	// Rebuild tree keeping only matched paths
	function pruneTree(nodes: FileNode[]): FileNode[] {
		const result: FileNode[] = [];
		for (const node of nodes) {
			if (!matchedNodes.has(node)) continue;
			if (node.type === "directory" && node.children) {
				result.push({ ...node, children: pruneTree(node.children) });
			} else {
				result.push(node);
			}
		}
		return result;
	}

	return pruneTree(tree);
}

/** Recursively sort tree nodes by name or size */
function sortTree(nodes: FileNode[], field: MediaSortField, direction: MediaSortDirection): FileNode[] {
	const compare = (a: FileNode, b: FileNode): number => {
		// Directories always first
		if (a.type !== b.type) return a.type === "directory" ? -1 : 1;

		let cmp: number;
		if (field === "size") {
			cmp = a.size - b.size;
		} else {
			cmp = a.name.localeCompare(b.name);
		}
		return direction === "desc" ? -cmp : cmp;
	};

	return [...nodes]
		.sort(compare)
		.map((node) =>
			node.children
				? { ...node, children: sortTree(node.children, field, direction) }
				: node,
		);
}
