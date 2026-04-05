import { listDirectory } from "@mithrandir/cli/lib/filesystem";
import { createServerFn } from "@tanstack/react-start";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ensureSession } from "#/lib/auth";

export const browseDirectory = createServerFn({ method: "GET" })
	.inputValidator((d: { path: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const resolvedPath = resolve(data.path || "/");
		return listDirectory(resolvedPath, { directoriesOnly: true });
	});

export const createDirectory = createServerFn({ method: "POST" })
	.inputValidator((d: { parentPath: string; name: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const dirPath = join(resolve(data.parentPath), data.name);
		await mkdir(dirPath, { recursive: true });
		return { path: dirPath };
	});
