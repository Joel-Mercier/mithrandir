import { resolve } from "path";

/** Resolve the monorepo root from the UI workspace */
export function getProjectRoot(): string {
  // In Docker, the repo is mounted at PROJECT_ROOT
  if (process.env.PROJECT_ROOT) return process.env.PROJECT_ROOT;
  // In dev, walk up from ui/src/lib/server/
  return resolve(import.meta.dirname, "../../../..");
}
