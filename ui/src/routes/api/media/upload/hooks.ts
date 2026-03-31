import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import { createFileRoute } from "@tanstack/react-router";
import { copyFile, mkdir, stat, unlink } from "fs/promises";
import { basename, join, resolve } from "path";
import { auth } from "#/lib/auth";
import { getProjectRoot } from "#/lib/server/utils";

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

/** tusd hook rejection response */
function reject(statusCode: number, message: string) {
	return Response.json({
		RejectUpload: true,
		HTTPResponse: {
			StatusCode: statusCode,
			Body: JSON.stringify({ message }),
			Header: { "Content-Type": "application/json" },
		},
	});
}

interface TusdHookBody {
	Type: string;
	Event: {
		Upload: {
			ID: string | null;
			Size: number;
			MetaData: Record<string, string>;
			Storage?: { Type: string; Path: string };
		};
		HTTPRequest: {
			Method: string;
			URI: string;
			Header: Record<string, string[]>;
		};
	};
}

async function handlePreCreate(request: Request, upload: TusdHookBody["Event"]["Upload"]) {
	// Auth: -hooks-http-forward-headers forwards Cookie directly on the hook request
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return reject(401, "Unauthorized");
	}

	const mediaType = upload.MetaData?.mediaType;
	const filename = upload.MetaData?.filename;

	if (!mediaType || !MEDIA_TYPES.has(mediaType)) {
		return reject(400, "Invalid media type");
	}
	if (!filename) {
		return reject(400, "Filename required");
	}

	// Check for duplicate at destination
	const projectRoot = getProjectRoot();
	const config = await loadEnvConfig(projectRoot);
	const safeName = sanitizeFilename(filename);
	const targetPath = join(resolve(config.BASE_DIR, "data/media", mediaType), safeName);

	try {
		await stat(targetPath);
		return reject(409, `File already exists: ${safeName}`);
	} catch {
		// File doesn't exist — good
	}

	console.log(`[upload] Created: ${safeName} (${mediaType})`);
	return Response.json({});
}

async function handlePostFinish(upload: TusdHookBody["Event"]["Upload"]) {
	const mediaType = upload.MetaData?.mediaType;
	const filename = upload.MetaData?.filename;
	if (!mediaType || !filename) return Response.json({});

	try {
		const projectRoot = getProjectRoot();
		const config = await loadEnvConfig(projectRoot);
		const safeName = sanitizeFilename(filename);
		const targetDir = resolve(config.BASE_DIR, "data/media", mediaType);
		await mkdir(targetDir, { recursive: true });
		const targetPath = join(targetDir, safeName);

		// tusd stores the file at Storage.Path
		const uploadPath = upload.Storage?.Path;
		if (!uploadPath) {
			console.error("[upload] No storage path in post-finish hook");
			return Response.json({});
		}

		// Use copy + delete to handle cross-device moves
		await copyFile(uploadPath, targetPath);
		await unlink(uploadPath);

		// Clean up tusd .info metadata file
		try {
			await unlink(`${uploadPath}.info`);
		} catch {
			// Already cleaned up
		}

		console.log(`[upload] Complete: ${safeName} → ${mediaType}/`);
	} catch (err) {
		console.error("[upload] Failed to move file:", err);
	}

	return Response.json({});
}

export const Route = createFileRoute("/api/media/upload/hooks")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const body: TusdHookBody = await request.json();

				if (body.Type === "pre-create") {
					return handlePreCreate(request, body.Event.Upload);
				}
				if (body.Type === "post-finish") {
					return handlePostFinish(body.Event.Upload);
				}

				return Response.json({});
			},
		},
	},
});
