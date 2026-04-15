import {
	isBackupArchive,
	stripArchiveSuffix,
} from "@mithrandir/cli/lib/backup-utils";
import { getBackupConfig, loadEnvConfig } from "@mithrandir/cli/lib/config";
import { listFiles } from "@mithrandir/cli/lib/rclone";
import { shell } from "@mithrandir/cli/lib/shell";
import { createServerFn } from "@tanstack/react-start";
import { existsSync } from "node:fs";
import { ensureSession } from "#/lib/auth";
import { logActivity } from "./activity";
import { getProjectRoot } from "./utils";

export const fetchBackupApps = createServerFn({ method: "GET" })
	.inputValidator(
		(d: { date: string; location: "local" | "remote"; remote?: string }) => d,
	)
	.handler(async ({ data }): Promise<string[]> => {
		await ensureSession();
		const { date, location, remote } = data;
		const dateStr = date.split("T")[0];

		if (location === "remote" && remote) {
			try {
				const allFiles = await listFiles(
					remote,
					`/backups/archive/${dateStr}`,
				);
				return allFiles
					.filter(isBackupArchive)
					.map(stripArchiveSuffix)
					.sort();
			} catch {
				return [];
			}
		}

		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const backupConfig = getBackupConfig(envConfig);
		const dateDir = `${backupConfig.BACKUP_DIR}/archive/${dateStr}`;

		if (!existsSync(dateDir)) return [];

		const result = await shell("ls", ["-1", dateDir], { ignoreError: true });
		if (result.exitCode !== 0 || !result.stdout.trim()) return [];

		return result.stdout
			.trim()
			.split("\n")
			.filter(isBackupArchive)
			.map(stripArchiveSuffix)
			.sort();
	});

export const restoreFromBackup = createServerFn({ method: "POST" })
	.inputValidator((d: { date: string; appNames?: string[] }) => d)
	.handler(async ({ data }): Promise<{ success: boolean; output: string }> => {
		await ensureSession();
		const { date, appNames } = data;
		const dateStr = date.split("T")[0];
		const projectRoot = getProjectRoot();

		// Full restore or restore specific apps one by one
		if (!appNames || appNames.length === 0) {
			const result = await shell(
				"/usr/local/bin/mithrandir",
				["restore", "full", dateStr, "--yes"],
				{ cwd: projectRoot, ignoreError: true, timeout: 600_000 },
			);
			const success = (result.exitCode ?? 0) === 0;
			await logActivity(
				"backup_restored",
				"backup",
				`full (${dateStr})`,
				"/backup-restore",
			);
			return {
				success,
				output: (result.stdout + result.stderr).trim(),
			};
		}

		const outputs: string[] = [];
		let allSuccess = true;
		for (const appName of appNames) {
			const result = await shell(
				"/usr/local/bin/mithrandir",
				["restore", appName, dateStr, "--yes"],
				{ cwd: projectRoot, ignoreError: true, timeout: 300_000 },
			);
			const success = (result.exitCode ?? 0) === 0;
			if (!success) allSuccess = false;
			outputs.push(
				`[${appName}] ${success ? "OK" : "FAILED"}\n${(result.stdout + result.stderr).trim()}`,
			);
		}
		await logActivity(
			"backup_restored",
			"backup",
			`${appNames.join(", ")} (${dateStr})`,
			"/backup-restore",
		);
		return {
			success: allSuccess,
			output: outputs.join("\n\n"),
		};
	});

export const recoverFromRemote = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ success: boolean; output: string }> => {
		await ensureSession();
		const projectRoot = getProjectRoot();

		const result = await shell(
			"/usr/local/bin/mithrandir",
			["recover", "--yes"],
			{
				cwd: projectRoot,
				ignoreError: true,
				timeout: 900_000,
			},
		);

		const success = (result.exitCode ?? 0) === 0;
		await logActivity(
			"disaster_recovery",
			"backup",
			null,
			"/backup-restore",
		);
		return {
			success,
			output: (result.stdout + result.stderr).trim(),
		};
	},
);
