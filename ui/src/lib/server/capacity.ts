import type { AppDefinition } from "@mithrandir/cli/lib/apps";
import {
	APP_CATEGORIES,
	APP_REGISTRY,
	getAppDir,
	getComposePath,
} from "@mithrandir/cli/lib/apps";
import {
	getPerformanceVerdict,
	getStorageVerdict,
	scoreToNumeric,
} from "@mithrandir/cli/lib/capacity";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import { shell } from "@mithrandir/cli/lib/shell";
import { createServerFn } from "@tanstack/react-start";
import { existsSync } from "fs";
import { ensureSession } from "#/lib/auth";
import { getProjectRoot } from "./utils";

// ─── Types ──────────────────────────────────────────────────────────

export interface CapacityStorageInfo {
	mountpoint: string;
	totalBytes: number;
	usedBytes: number;
	availBytes: number;
}

export interface CapacityAppInfo {
	name: string;
	displayName: string;
	category: string;
	installed: boolean;
	diskUsage: string;
	performanceScore: "low" | "medium" | "high";
	storageScore: "low" | "medium" | "high";
	note: string;
}

export interface CapacityData {
	system: {
		cpuModel: string;
		cpuCores: number;
		ramTotalMB: number;
		storage: CapacityStorageInfo[];
	};
	apps: CapacityAppInfo[];
	totalPerformanceScore: number;
	maxPerformanceScore: number;
	totalStorageScore: number;
	maxStorageScore: number;
	performanceVerdict: { label: string; color: string };
	storageVerdict: { label: string; color: string };
}

// ─── Helpers ────────────────────────────────────────────────────────

function mapCategory(app: AppDefinition): string {
	for (const cat of APP_CATEGORIES) {
		if (cat.apps.includes(app.name)) return cat.value;
	}
	return "utilities";
}

async function getDiskUsage(
	app: AppDefinition,
	baseDir: string,
): Promise<string> {
	const appDir = getAppDir(app, baseDir);
	if (!existsSync(appDir)) return "\u2014";
	const result = await shell("du", ["-sh", appDir], {
		sudo: true,
		ignoreError: true,
		timeout: 10000,
	});
	if (result.exitCode !== 0 || !result.stdout.trim()) return "\u2014";
	return result.stdout.trim().split(/\s+/)[0] || "\u2014";
}

async function getStorageInfo(paths: string[]): Promise<CapacityStorageInfo[]> {
	const uniquePaths = [...new Set(paths.filter((p) => existsSync(p)))];
	if (uniquePaths.length === 0) return [];

	const dfResult = await shell(
		"df",
		["-B1", "--output=source,size,used,avail,target", ...uniquePaths],
		{ ignoreError: true, timeout: 5000 },
	);
	if (dfResult.exitCode !== 0 || !dfResult.stdout.trim()) return [];

	const lines = dfResult.stdout.trim().split("\n").slice(1);
	const seen = new Set<string>();
	const infos: CapacityStorageInfo[] = [];

	for (const line of lines) {
		const parts = line.trim().split(/\s+/);
		if (parts.length < 5) continue;
		const [, totalStr, usedStr, availStr, ...targetParts] = parts;
		const mountpoint = targetParts.join(" ");
		if (seen.has(mountpoint)) continue;
		seen.add(mountpoint);
		infos.push({
			mountpoint,
			totalBytes: parseInt(totalStr, 10),
			usedBytes: parseInt(usedStr, 10),
			availBytes: parseInt(availStr, 10),
		});
	}

	return infos;
}

// ─── Server function ────────────────────────────────────────────────

export const fetchCapacity = createServerFn({ method: "GET" }).handler(
	async (): Promise<CapacityData> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;
		const backupDir = envConfig.BACKUP_DIR ?? "/backups";

		// System info via docker (same approach as fetchResources)
		let cpuModel = "Unknown";
		let cpuCores = 1;
		let ramTotalMB = 0;

		const infoResult = await shell(
			"docker",
			["info", "--format", "{{.NCPU}}\t{{.MemTotal}}"],
			{ ignoreError: true, timeout: 5000 },
		);
		if (infoResult.exitCode === 0 && infoResult.stdout.trim()) {
			const parts = infoResult.stdout.trim().split("\t");
			cpuCores = parseInt(parts[0] ?? "1", 10) || 1;
			const memBytes = parseInt(parts[1] ?? "0", 10);
			ramTotalMB = Math.round(memBytes / (1024 * 1024));
		}

		// CPU model
		const modelResult = await shell(
			"sh",
			[
				"-c",
				"cat /proc/cpuinfo 2>/dev/null | grep 'model name' | head -1 | cut -d: -f2",
			],
			{ ignoreError: true, timeout: 5000 },
		);
		if (modelResult.exitCode === 0 && modelResult.stdout.trim()) {
			cpuModel = modelResult.stdout.trim();
		}

		// RAM from /proc/meminfo
		const memResult = await shell(
			"sh",
			["-c", "cat /proc/meminfo 2>/dev/null | grep '^MemTotal:'"],
			{ ignoreError: true, timeout: 5000 },
		);
		if (memResult.exitCode === 0 && memResult.stdout.trim()) {
			const match = memResult.stdout.match(/(\d+)\s*kB/);
			if (match) ramTotalMB = Math.round(parseInt(match[1], 10) / 1024);
		}

		// Storage
		const storage = await getStorageInfo([baseDir, backupDir]);

		// Per-app capacity info
		const visibleApps = APP_REGISTRY.filter((app) => !app.companionOf);
		const apps = await Promise.all(
			visibleApps.map(async (app): Promise<CapacityAppInfo> => {
				const installed = existsSync(getComposePath(app, baseDir));
				const diskUsage = installed
					? await getDiskUsage(app, baseDir)
					: "\u2014";
				const capacity = app.capacity ?? {
					performance: "low" as const,
					storage: "low" as const,
				};
				return {
					name: app.name,
					displayName: app.displayName,
					category: mapCategory(app),
					installed,
					diskUsage,
					performanceScore: capacity.performance,
					storageScore: capacity.storage,
					note: capacity.note ?? "",
				};
			}),
		);

		const installedApps = apps.filter((a) => a.installed);
		const totalPerformanceScore = installedApps.reduce(
			(sum, a) => sum + scoreToNumeric(a.performanceScore),
			0,
		);
		const totalStorageScore = installedApps.reduce(
			(sum, a) => sum + scoreToNumeric(a.storageScore),
			0,
		);
		const maxPerformanceScore = installedApps.length * 3;
		const maxStorageScore = installedApps.length * 3;

		return {
			system: { cpuModel, cpuCores, ramTotalMB, storage },
			apps,
			totalPerformanceScore,
			maxPerformanceScore,
			totalStorageScore,
			maxStorageScore,
			performanceVerdict: getPerformanceVerdict(
				totalPerformanceScore,
				cpuCores,
				ramTotalMB,
			),
			storageVerdict: getStorageVerdict(storage),
		};
	},
);
