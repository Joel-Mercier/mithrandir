import { listDirectory } from "@mithrandir/cli/lib/filesystem";
import { createServerFn } from "@tanstack/react-start";
import { resolve } from "node:path";
import { ensureSession } from "#/lib/auth";

export const browseDirectory = createServerFn({ method: "GET" })
	.inputValidator((d: { path: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const resolvedPath = resolve(data.path || "/");
		return listDirectory(resolvedPath, { directoriesOnly: true });
	});
