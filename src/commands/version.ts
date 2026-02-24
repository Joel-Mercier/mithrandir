import { readFileSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";
import { getProjectRoot } from "@/lib/config.js";

export function getVersionString(): string {
  let version = "unknown";
  try {
    const root = getProjectRoot();
    const pkg = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf-8"),
    );
    version = pkg.version ?? "unknown";
  } catch {
    // package.json not found
  }

  let gitHash = "";
  try {
    const root = getProjectRoot();
    gitHash = execSync("git rev-parse --short HEAD", {
      cwd: root,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    // Not in a git repo or git not available
  }

  const suffix = gitHash ? ` (${gitHash})` : "";
  return `v${version}${suffix}`;
}

export async function runVersion(): Promise<void> {
  console.log(`mithrandir ${getVersionString()}`);
}
