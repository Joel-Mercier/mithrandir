import { resolve } from "path";

/** Resolve the monorepo root from the UI workspace */
export function getProjectRoot(): string {
  // ui/src/lib/server/ is four levels below the monorepo root
  return resolve(import.meta.dirname, "../../../..");
}
