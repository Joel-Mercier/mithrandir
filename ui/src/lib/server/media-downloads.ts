import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import {
	type ApplyMediaSettingsResult,
	applyMediaDownloadSettings,
	type DownloadsScan,
	inspectMediaDownloads,
	type MediaDownloadsStatus,
	type PruneResult,
	type PruneSelection,
	pruneDownloads,
	scanDownloads,
} from "@mithrandir/cli/lib/media-downloads";
import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/lib/auth";
import { logActivity } from "./activity";
import { getProjectRoot } from "./utils";

export interface MediaDownloadsOverview {
	status: MediaDownloadsStatus;
	/** null when the media stack isn't installed or qBittorrent can't be reached */
	scan: DownloadsScan | null;
}

export interface MediaDownloadsFixInput {
	/** qBittorrent WebUI login, saved to .env when it works */
	credentials?: { username: string; password: string } | null;
}

/** Settings check + hardlink scan of the downloads folder (read-only, equivalent to `mithrandir media`) */
export const fetchMediaDownloads = createServerFn({ method: "GET" }).handler(
	async (): Promise<MediaDownloadsOverview> => {
		await ensureSession();
		const env = await loadEnvConfig(getProjectRoot());
		const status = await inspectMediaDownloads(env);
		const scan =
			status.relevant && status.qbittorrent.reachable
				? await scanDownloads(env)
				: null;
		return { status, scan };
	},
);

/** Apply the recommended download settings (equivalent to `mithrandir media fix`). Never deletes anything. */
export const fixMediaDownloads = createServerFn({ method: "POST" })
	.inputValidator((d: MediaDownloadsFixInput) => d)
	.handler(async ({ data }): Promise<ApplyMediaSettingsResult> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const env = await loadEnvConfig(projectRoot);
		const credentials =
			data.credentials?.username && data.credentials.password
				? data.credentials
				: null;
		const result = await applyMediaDownloadSettings(env, {
			credentials,
			projectRoot,
		});
		await logActivity("media_downloads_fix", "system", null, "/media-library");
		return result;
	});

/** Delete selected leftovers (equivalent to `mithrandir media prune`). Items are re-validated server-side. */
export const pruneMediaDownloads = createServerFn({ method: "POST" })
	.inputValidator((d: PruneSelection) => ({
		hashes: Array.isArray(d.hashes) ? d.hashes.map(String) : [],
		orphanPaths: Array.isArray(d.orphanPaths) ? d.orphanPaths.map(String) : [],
	}))
	.handler(async ({ data }): Promise<PruneResult> => {
		await ensureSession();
		const env = await loadEnvConfig(getProjectRoot());
		const result = await pruneDownloads(env, data);
		const names = [
			...result.removedTorrents.map((t) => t.name),
			...result.deletedOrphans.map((o) => o.relativePath),
		];
		if (names.length > 0) {
			await logActivity(
				"media_downloads_prune",
				"media",
				names.length === 1 ? names[0] : `${names.length} items`,
				"/media-library",
			);
		}
		return result;
	});
