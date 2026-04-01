import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import type {
	DiskUsageInfo,
	MediaCategory,
	MediaLibraryData,
} from "@mithrandir/cli/lib/media";
import { MEDIA_CATEGORIES, scanMediaCategory, scanMediaLibrary } from "@mithrandir/cli/lib/media";
import { shell } from "@mithrandir/cli/lib/shell";
import { createServerFn } from "@tanstack/react-start";
import { existsSync } from "fs";
import { resolve } from "path";
import { ensureSession } from "#/lib/auth";
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
	.inputValidator((d: { category: string }) => d)
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

		return { categories: [categoryInfo], disk, mediaDir };
	});
