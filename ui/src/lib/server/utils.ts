import { resolve } from "path";

/** Resolve the monorepo root from the UI workspace */
export function getProjectRoot(): string {
  // Walk up from ui/src/lib/server/ to repo root
  return resolve(import.meta.dirname, "../../../..");
}
