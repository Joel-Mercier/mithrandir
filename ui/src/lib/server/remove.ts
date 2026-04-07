import {
	stopAllApps,
	removeAllSystemdUnits,
	deleteBackups,
	removeRclone,
	getAppDataDirs,
	removeAppDataDirs,
	stopDocker,
	removeDocker,
	removeLogs,
	removeCliArtifacts,
	removeEnvFile,
} from "@mithrandir/cli/lib/remove";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import { commandExists } from "@mithrandir/cli/lib/shell";
import { createServerFn } from "@tanstack/react-start";
import { existsSync } from "fs";
import { ensureSession } from "#/lib/auth";
import { getProjectRoot } from "./utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RemoveInfo {
	backupDir: string;
	baseDir: string;
	appDataDirs: string[];
	hasBackupService: boolean;
	hasUiService: boolean;
	hasTusdService: boolean;
	hasDocker: boolean;
	hasRclone: boolean;
	hasBackups: boolean;
}

// ─── Preflight info ──────────────────────────────────────────────────────────

export const fetchRemoveInfo = createServerFn({ method: "GET" }).handler(
	async (): Promise<RemoveInfo> => {
		await ensureSession();

		const env = await loadEnvConfig();
		const baseDir = env.BASE_DIR;
		const backupDir = env.BACKUP_DIR || "/backups";

		return {
			backupDir,
			baseDir,
			appDataDirs: getAppDataDirs(baseDir),
			hasBackupService: existsSync(
				"/etc/systemd/system/homelab-backup.timer",
			),
			hasUiService: existsSync(
				"/etc/systemd/system/mithrandir-ui.service",
			),
			hasTusdService: existsSync(
				"/etc/systemd/system/mithrandir-tusd.service",
			),
			hasDocker: await commandExists("docker"),
			hasRclone: await commandExists("rclone"),
			hasBackups: existsSync(backupDir),
		};
	},
);

// ─── Step functions ──────────────────────────────────────────────────────────

export const removeStopApps = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ stopped: string[] }> => {
		await ensureSession();
		const env = await loadEnvConfig();
		const stopped = await stopAllApps(env.BASE_DIR);
		return { stopped };
	},
);

export const removeSystemdServices = createServerFn({
	method: "POST",
}).handler(async (): Promise<{ success: boolean }> => {
	await ensureSession();
	await removeAllSystemdUnits();
	return { success: true };
});

export const removeBackups = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ deleted: boolean; backupDir: string }> => {
		await ensureSession();
		const env = await loadEnvConfig();
		const backupDir = env.BACKUP_DIR || "/backups";
		const deleted = await deleteBackups(backupDir);
		return { deleted, backupDir };
	},
);

export const removeRcloneServer = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ removed: boolean }> => {
		await ensureSession();
		const removed = await removeRclone();
		return { removed };
	},
);

export const removeAppData = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ count: number; baseDir: string }> => {
		await ensureSession();
		const env = await loadEnvConfig();
		const dirs = getAppDataDirs(env.BASE_DIR);
		await removeAppDataDirs(env.BASE_DIR, dirs);
		return { count: dirs.length, baseDir: env.BASE_DIR };
	},
);

export const removeDockerServer = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ success: boolean }> => {
		await ensureSession();
		await stopDocker();
		await removeDocker();
		return { success: true };
	},
);

export const removeCleanup = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ success: boolean }> => {
		await ensureSession();
		await removeLogs();
		await removeCliArtifacts();
		return { success: true };
	},
);

export const removeConfig = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ removed: boolean }> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const removed = await removeEnvFile(projectRoot);
		return { removed };
	},
);
