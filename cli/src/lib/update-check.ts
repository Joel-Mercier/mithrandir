import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getProjectRoot } from "@/lib/config.js";
import { shell } from "@/lib/shell.js";

const CACHE_DIR = join(homedir(), ".cache", "mithrandir");
const CACHE_FILE = join(CACHE_DIR, "last-update-check");
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if an update is available by comparing local HEAD with remote.
 * Returns a notice string if an update is available, or null.
 * Designed to be fast and non-blocking — skips if checked recently.
 */
export async function checkForUpdate(): Promise<string | null> {
  try {
    // Skip if checked recently
    if (existsSync(CACHE_FILE)) {
      const lastCheck = parseInt(readFileSync(CACHE_FILE, "utf-8").trim(), 10);
      if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return null;
    }

    const root = getProjectRoot();

    // Run git fetch to get latest remote state
    const sudoUser = process.env.SUDO_USER;
    const userOpts = sudoUser ? { user: sudoUser } : {};
    const fetch = await shell("git", ["fetch", "--quiet"], {
      cwd: root,
      ignoreError: true,
      ...userOpts,
    });
    if (fetch.exitCode !== 0) return null;

    // Compare local HEAD with upstream
    const local = await shell("git", ["rev-parse", "HEAD"], {
      cwd: root,
      ignoreError: true,
      ...userOpts,
    });
    const branch = await shell("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
      ignoreError: true,
      ...userOpts,
    });
    if (local.exitCode !== 0 || branch.exitCode !== 0) return null;

    const remote = await shell(
      "git",
      ["rev-parse", `origin/${branch.stdout.trim()}`],
      { cwd: root, ignoreError: true, ...userOpts },
    );
    if (remote.exitCode !== 0) return null;

    // Write cache timestamp regardless of result
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, String(Date.now()));

    const localHash = local.stdout.trim();
    const remoteHash = remote.stdout.trim();

    if (localHash !== remoteHash) {
      // Count how many commits behind
      const behindResult = await shell(
        "git",
        ["rev-list", "--count", `HEAD..origin/${branch.stdout.trim()}`],
        { cwd: root, ignoreError: true, ...userOpts },
      );
      const count = behindResult.exitCode === 0
        ? behindResult.stdout.trim()
        : "new";
      return `Update available (${count} commit${count === "1" ? "" : "s"} behind). Run \`mithrandir self-update\` to update.`;
    }

    return null;
  } catch {
    // Never let update check break the CLI
    return null;
  }
}
