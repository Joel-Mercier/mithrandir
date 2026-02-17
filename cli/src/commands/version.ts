import { createRequire } from "module";
import { execSync } from "child_process";
import { getProjectRoot } from "../lib/config.js";

export async function runVersion(): Promise<void> {
  const require = createRequire(import.meta.url);
  const pkg = require("../../package.json");
  const version = pkg.version ?? "unknown";

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
  console.log(`mithrandir v${version}${suffix}`);
}
