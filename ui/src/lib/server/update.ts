import { isUiServiceActive } from "@mithrandir/cli/lib/systemd-ui";
import { isTusdServiceActive, installTusdService } from "@mithrandir/cli/lib/systemd-tusd";
import { deployUiBuild, hasValidDeployment } from "@mithrandir/cli/lib/deploy-ui";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import { shell } from "@mithrandir/cli/lib/shell";
import { createServerFn } from "@tanstack/react-start";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureSession } from "#/lib/auth";
import { logActivity } from "./activity";
import { getProjectRoot } from "./utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UpdateCheckResult {
	updateAvailable: boolean;
	currentCommit: string;
	remoteCommit: string;
	branch: string;
}

export interface PullResult {
	before: string;
	after: string;
	branch: string;
	skipped: boolean;
}

export interface StepResult {
	success: boolean;
	willRestart?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const UPDATE_LOG = "/var/log/mithrandir-ui-update.log";

/** Append a timestamped line to the persistent update log. */
function logUpdate(message: string): void {
	const ts = new Date().toISOString();
	try {
		appendFileSync(UPDATE_LOG, `[${ts}] ${message}\n`);
	} catch {
		// Log directory might not be writable — silently ignore
	}
}

/** Build git args with safe.directory config to avoid dubious ownership errors
 *  when the UI service runs as root but the repo is owned by another user */
function gitArgs(root: string, args: string[]): string[] {
	return ["-c", `safe.directory=${root}`, ...args];
}

/** Build git args for commands that talk to remotes (fetch/pull).
 *  Rewrites SSH URLs to HTTPS so git works when the UI service runs as root
 *  without the user's SSH keys (works for public repos without auth). */
function gitRemoteArgs(root: string, args: string[]): string[] {
	return [
		"-c",
		`safe.directory=${root}`,
		"-c",
		"url.https://github.com/.insteadOf=git@github.com:",
		...args,
	];
}

// ─── Server functions ────────────────────────────────────────────────────────

export const checkForUpdates = createServerFn({ method: "GET" }).handler(
	async (): Promise<UpdateCheckResult> => {
		await ensureSession();
		const root = getProjectRoot();

		const fetch = await shell("git", gitRemoteArgs(root, ["fetch", "--all"]), {
			cwd: root,
			ignoreError: true,
			timeout: 30000,
		});
		if (fetch.exitCode !== 0) {
			logUpdate(`[check] git fetch failed: ${fetch.stderr}`);
			throw new Error(`git fetch failed: ${fetch.stderr}`);
		}

		const branchResult = await shell(
			"git",
			gitArgs(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
			{ cwd: root, ignoreError: true },
		);
		if (branchResult.exitCode !== 0) {
			throw new Error(
				`Could not determine branch: ${branchResult.stderr}`,
			);
		}
		const branch = branchResult.stdout.trim();

		const localResult = await shell(
			"git",
			gitArgs(root, ["rev-parse", "HEAD"]),
			{ cwd: root, ignoreError: true },
		);
		const currentCommit = localResult.stdout.trim().slice(0, 8);

		const remoteResult = await shell(
			"git",
			gitArgs(root, ["rev-parse", `origin/${branch}`]),
			{ cwd: root, ignoreError: true },
		);
		const remoteCommit = remoteResult.stdout.trim().slice(0, 8);

		return {
			updateAvailable: currentCommit !== remoteCommit,
			currentCommit,
			remoteCommit,
			branch,
		};
	},
);

export const pullLatestChanges = createServerFn({ method: "POST" }).handler(
	async (): Promise<PullResult> => {
		await ensureSession();
		const root = getProjectRoot();
		// Start a fresh log section for this update run
		try { writeFileSync(UPDATE_LOG, `${"=".repeat(60)}\nSelf-update started at ${new Date().toISOString()}\nProject root: ${root}\n${"=".repeat(60)}\n`); } catch {}

		const branchResult = await shell(
			"git",
			gitArgs(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
			{ cwd: root, ignoreError: true },
		);
		const branch = branchResult.stdout.trim();

		const beforeResult = await shell(
			"git",
			gitArgs(root, ["rev-parse", "HEAD"]),
			{ cwd: root, ignoreError: true },
		);
		const before = beforeResult.stdout.trim().slice(0, 8);

		logUpdate(`[pull] branch=${branch} before=${before}`);
		const pull = await shell(
			"git",
			gitRemoteArgs(root, ["pull", "--ff-only"]),
			{ cwd: root, ignoreError: true },
		);
		if (pull.exitCode !== 0) {
			logUpdate(`[pull] FAILED (exit ${pull.exitCode}): ${pull.stderr}`);
			throw new Error(
				`git pull failed (non-fast-forward?):\n${pull.stderr}`,
			);
		}

		const afterResult = await shell(
			"git",
			gitArgs(root, ["rev-parse", "HEAD"]),
			{ cwd: root, ignoreError: true },
		);
		const after = afterResult.stdout.trim().slice(0, 8);

		logUpdate(`[pull] after=${after} skipped=${before === after}`);
		return { before, after, branch, skipped: before === after };
	},
);

export const installDeps = createServerFn({ method: "POST" }).handler(
	async (): Promise<StepResult> => {
		await ensureSession();
		const root = getProjectRoot();

		logUpdate("[deps] Running bun install...");
		const result = await shell("bun", ["install"], {
			cwd: root,
			ignoreError: true,
			timeout: 120000,
		});
		if (result.exitCode !== 0) {
			logUpdate(`[deps] FAILED (exit ${result.exitCode}):\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
			throw new Error(`bun install failed:\n${result.stderr}`);
		}

		logUpdate("[deps] OK");
		return { success: true };
	},
);

export const buildCli = createServerFn({ method: "POST" }).handler(
	async (): Promise<StepResult> => {
		await ensureSession();
		const root = getProjectRoot();

		logUpdate("[build-cli] Running bun run cli:build...");
		const result = await shell("bun", ["run", "cli:build"], {
			cwd: root,
			ignoreError: true,
			timeout: 120000,
		});
		if (result.exitCode !== 0) {
			logUpdate(`[build-cli] FAILED (exit ${result.exitCode}):\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
			throw new Error(`CLI build failed:\n${result.stderr}`);
		}

		logUpdate("[build-cli] OK");
		return { success: true };
	},
);

export const buildUi = createServerFn({ method: "POST" }).handler(
	async (): Promise<StepResult> => {
		await ensureSession();
		const root = getProjectRoot();

		// Fix ownership of the entire ui/ directory — the systemd service runs
		// as root and creates various dirs (.output, src/paraglide, node_modules/.nitro)
		// that the build process needs to overwrite
		const { stdout: owner } = await shell(
			"stat",
			["-c", "%U", root],
			{ ignoreError: true },
		);
		const repoOwner = owner.trim();
		logUpdate(`[build-ui] Repo owner: "${repoOwner}", running as uid=${process.getuid?.()}`);
		if (repoOwner && repoOwner !== "root") {
			logUpdate(`[build-ui] Fixing ownership: chown -R ${repoOwner}: ui/`);
			const chownResult = await shell("chown", ["-R", `${repoOwner}:`, join(root, "ui")], {
				sudo: true,
				ignoreError: true,
			});
			if (chownResult.exitCode !== 0) {
				logUpdate(`[build-ui] chown warning (exit ${chownResult.exitCode}): ${chownResult.stderr}`);
			}
		}

		logUpdate("[build-ui] Running bun run ui:build...");
		const result = await shell("bun", ["run", "ui:build"], {
			cwd: root,
			ignoreError: true,
			timeout: 300000,
		});
		if (result.exitCode !== 0) {
			const output = [result.stderr, result.stdout].filter(Boolean).join("\n");
			logUpdate(`[build-ui] FAILED (exit ${result.exitCode}):\n${output}`);
			throw new Error(`UI build failed (exit ${result.exitCode}). Full log: ${UPDATE_LOG}\n${output}`);
		}

		logUpdate("[build-ui] Build succeeded, deploying to blue-green slot...");
		const uiDir = join(root, "ui");
		try {
			await deployUiBuild(uiDir);
			logUpdate("[build-ui] Deployed successfully");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logUpdate(`[build-ui] Deploy FAILED: ${msg}`);
			throw new Error(`UI deploy failed: ${msg}. Full log: ${UPDATE_LOG}`);
		}

		return { success: true };
	},
);

export const finalizeUpdate = createServerFn({ method: "POST" }).handler(
	async (): Promise<StepResult> => {
		await ensureSession();
		const root = getProjectRoot();

		logUpdate("[finalize] Re-creating CLI symlink...");
		// Re-create the CLI symlink
		const distFile = join(root, "cli", "dist", "mithrandir.js");
		await shell("ln", ["-sf", distFile, "/usr/local/bin/mithrandir"], {
			sudo: true,
		});

		await logActivity("self_update", "system", null, "/settings");

		// Ensure tusd is set up (handles upgrade from pre-tusd versions)
		try {
			const tusdBin = join(root, "ui", ".tusd", "tusd");
			if (!existsSync(tusdBin)) {
				await shell("bun", ["run", join(root, "ui", "scripts", "download-tusd.ts")], {
					cwd: join(root, "ui"),
					ignoreError: true,
					timeout: 120000,
				});
			}
			const tusdActive = await isTusdServiceActive();
			if (!tusdActive && existsSync(join(root, "ui", ".tusd", "tusd"))) {
				const envConfig = await loadEnvConfig(root);
				const uploadDir = join(envConfig.BASE_DIR, "data/media/.uploads");
				mkdirSync(uploadDir, { recursive: true });
				await installTusdService(root, uploadDir);
			}
		} catch {
			// Non-critical — uploads will be unavailable but app still works
		}

		// Check if UI service is active and trigger a delayed restart
		// Only restart if the build output exists — if the UI build failed,
		// restarting would cause an infinite crash loop
		let willRestart = false;
		const outputExists = hasValidDeployment(join(root, "ui"));
		logUpdate(`[finalize] Valid deployment exists: ${outputExists}`);
		try {
			const active = await isUiServiceActive();
			logUpdate(`[finalize] UI service active: ${active}`);
			if (active && outputExists) {
				willRestart = true;
				// Spawn a detached background process that restarts both tusd and UI
				// after a 2-second delay, giving time for this response to be sent.
				// Restart tusd first since the UI's upload hooks depend on it.
				const tusdActive = await isTusdServiceActive();
				const restartCmd = tusdActive
					? "sleep 2 && systemctl restart mithrandir-tusd && systemctl restart mithrandir-ui"
					: "sleep 2 && systemctl restart mithrandir-ui";
				await shell(
					"sh",
					["-c", `nohup sh -c '${restartCmd}' >/dev/null 2>&1 &`],
					{ sudo: true, ignoreError: true },
				);
			}
		} catch {
			// Non-critical — service may not be installed
		}

		logUpdate(`[finalize] Done. willRestart=${willRestart}`);
		return { success: true, willRestart };
	},
);

export const pingHealth = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ ok: boolean }> => {
		return { ok: true };
	},
);
