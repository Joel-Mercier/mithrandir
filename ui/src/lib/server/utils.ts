import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

/** Resolve the monorepo root by walking up to find the workspace root package.json.
 *  Works from both source (ui/src/lib/server/) and bundled (.deployments/current/server/) locations. */
export function getProjectRoot(): string {
	let dir = dirname(new URL(import.meta.url).pathname);
	let firstPkgDir: string | null = null;
	while (dir !== dirname(dir)) {
		const pkgPath = join(dir, "package.json");
		if (existsSync(pkgPath)) {
			if (!firstPkgDir) firstPkgDir = dir;
			try {
				if (JSON.parse(readFileSync(pkgPath, "utf-8")).workspaces) return dir;
			} catch {}
		}
		dir = dirname(dir);
	}
	if (firstPkgDir) return firstPkgDir;
	throw new Error("Could not find mithrandir project root");
}
