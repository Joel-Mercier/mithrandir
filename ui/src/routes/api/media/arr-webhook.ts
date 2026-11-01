import { timingSafeEqual } from "node:crypto";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import {
	cleanupDeletedDownloads,
	MEDIA_WEBHOOK_USERNAME,
} from "@mithrandir/cli/lib/media-downloads";
import { createFileRoute } from "@tanstack/react-router";
import { logActivity } from "#/lib/server/activity";
import { getProjectRoot } from "#/lib/server/utils";

/**
 * Radarr/Sonarr/Lidarr "Mithrandir download cleanup" webhook.
 *
 * Delete events (movie/series/episode file/album deleted in the *arr) trigger
 * removal of the matching seeding copy in qBittorrent once nothing in the
 * library uses its files anymore. Import events let the scan remember which
 * torrents are hardlinked. Nothing time- or ratio-based is ever removed.
 */

/** Events usually arrive in bursts (deleting a series, upgrades) — coalesce them */
const DEBOUNCE_MS = 15_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let rerun = false;

function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function isAuthorized(request: Request, secret: string): boolean {
	const header = request.headers.get("authorization") ?? "";
	if (!header.startsWith("Basic ")) return false;
	const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
	const sep = decoded.indexOf(":");
	if (sep === -1) return false;
	return (
		safeEqual(decoded.slice(0, sep), MEDIA_WEBHOOK_USERNAME) &&
		safeEqual(decoded.slice(sep + 1), secret)
	);
}

async function runCleanup(): Promise<void> {
	if (running) {
		rerun = true;
		return;
	}
	running = true;
	try {
		const env = await loadEnvConfig(getProjectRoot());
		const result = await cleanupDeletedDownloads(env);
		if (result.error) {
			console.error(`[arr-webhook] cleanup skipped: ${result.error}`);
		}
		for (const torrent of result.removed) {
			await logActivity(
				"media_download_cleanup",
				"media",
				torrent.name,
				"/media-library",
			);
		}
	} catch (err) {
		console.error("[arr-webhook] cleanup failed:", err);
	} finally {
		running = false;
		if (rerun) {
			rerun = false;
			schedule();
		}
	}
}

function schedule(): void {
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => {
		timer = null;
		void runCleanup();
	}, DEBOUNCE_MS);
}

export const Route = createFileRoute("/api/media/arr-webhook")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const env = await loadEnvConfig(getProjectRoot());
				const secret = env.MEDIA_WEBHOOK_SECRET;
				if (!secret || !isAuthorized(request, secret)) {
					return new Response("Unauthorized", { status: 401 });
				}

				const body = (await request.json().catch(() => ({}))) as {
					eventType?: string;
				};
				const eventType = body.eventType ?? "";
				// "Test" is sent when saving/testing the connection in the *arr UI
				if (eventType && eventType !== "Test") schedule();

				return Response.json({ ok: true });
			},
		},
	},
});
