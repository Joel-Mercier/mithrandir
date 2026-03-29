import { FileStore } from "@tus/file-store";
import { EVENTS, Server } from "@tus/server";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import { copyFile, mkdir, stat, unlink } from "fs/promises";
import { basename, join, resolve } from "path";
import { auth } from "#/lib/auth";
import { getProjectRoot } from "./utils";

const MEDIA_TYPES = new Set([
	"movies",
	"tv",
	"music",
	"audiobooks",
	"podcasts",
	"pictures",
]);

function sanitizeFilename(name: string): string {
	let safe = basename(name);
	safe = safe.replace(/\0/g, "").replace(/\.\./g, "");
	safe = safe.replace(/[/\\:*?"<>|]/g, "_");
	safe = safe.replace(/^\.+/, "");
	safe = safe.slice(0, 255);
	return safe || `upload_${Date.now()}`;
}

let tusServer: Server | null = null;

export async function getTusServer(): Promise<Server> {
	if (tusServer) return tusServer;

	const projectRoot = getProjectRoot();
	const config = await loadEnvConfig(projectRoot);
	const uploadDir = resolve(config.BASE_DIR, "data/media/.uploads");
	await mkdir(uploadDir, { recursive: true });

	tusServer = new Server({
		path: "/api/media/upload/tus",
		datastore: new FileStore({ directory: uploadDir }),
		respectForwardedHeaders: true,

		async onIncomingRequest(req) {
			const session = await auth.api.getSession({
				headers: req.headers,
			});
			if (!session) {
				throw { status_code: 401, body: "Unauthorized" };
			}
		},

		async onUploadCreate(_req, upload) {
			const mediaType = upload.metadata?.mediaType;
			const filename = upload.metadata?.filename;

			if (!mediaType || !MEDIA_TYPES.has(mediaType)) {
				throw { status_code: 400, body: "Invalid media type" };
			}
			if (!filename) {
				throw { status_code: 400, body: "Filename required" };
			}

			// Check for duplicate at destination
			const safeName = sanitizeFilename(filename);
			const targetDir = resolve(config.BASE_DIR, "data/media", mediaType);
			const targetPath = join(targetDir, safeName);

			try {
				await stat(targetPath);
				throw {
					status_code: 409,
					body: `File already exists: ${safeName}`,
				};
			} catch (err: unknown) {
				if (
					err &&
					typeof err === "object" &&
					"status_code" in err &&
					(err as { status_code: number }).status_code === 409
				)
					throw err;
			}

			console.log(`[upload] Created: ${safeName} (${mediaType})`);
			return {};
		},
	});

	// Move completed uploads to their final media directory.
	// POST_FINISH fires after the response is sent to the client,
	// so file operations here won't block or stall the upload.
	tusServer.on(EVENTS.POST_FINISH, async (_req, _res, upload) => {
		const mediaType = upload.metadata?.mediaType;
		const filename = upload.metadata?.filename;
		if (!mediaType || !filename) return;

		try {
			const safeName = sanitizeFilename(filename);
			const targetDir = resolve(config.BASE_DIR, "data/media", mediaType);
			await mkdir(targetDir, { recursive: true });
			const targetPath = join(targetDir, safeName);

			const uploadPath = join(uploadDir, upload.id);
			// Use copy + delete instead of rename to handle cross-device moves
			await copyFile(uploadPath, targetPath);
			await unlink(uploadPath);

			// Clean up tus metadata file
			try {
				await unlink(`${uploadPath}.json`);
			} catch {
				// Already cleaned up
			}

			console.log(`[upload] Complete: ${safeName} → ${mediaType}/`);
		} catch (err) {
			console.error("[upload] Failed to move file:", err);
		}
	});

	return tusServer;
}
