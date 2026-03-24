import { getDuckDnsDomain } from "@mithrandir/cli/lib/caddy";
import {
	getBackupConfig,
	loadEnvConfig,
	saveEnvConfig,
} from "@mithrandir/cli/lib/config";
import { runHealthChecks } from "@mithrandir/cli/lib/health";
import { shell } from "@mithrandir/cli/lib/shell";
import { gatherSystemInfo } from "@mithrandir/cli/lib/status";
import { createServerFn } from "@tanstack/react-start";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ensureSession } from "#/lib/auth";
import type {
	HealthStatus,
	SystemConfig,
	SystemResources,
	VersionInfo,
} from "#/lib/types";
import { logActivity } from "./activity";
import { getProjectRoot } from "./utils";

export const fetchSystemStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<HealthStatus> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const info = await gatherSystemInfo(projectRoot);

		const running = info.apps.filter(
			(a) => a.containerStatus === "running",
		).length;
		const stopped = info.apps.length - running;

		return {
			performanceVerdict: "Comfortable",
			storageVerdict: "Healthy",
			dockerRunning: info.dockerRunning,
			appsRunning: running,
			appsStopped: stopped,
			appsTotal: info.apps.length,
		};
	},
);

export const fetchHealthChecks = createServerFn({ method: "GET" }).handler(
	async () => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		return await runHealthChecks(projectRoot);
	},
);

export const fetchConfig = createServerFn({ method: "GET" }).handler(
	async (): Promise<SystemConfig> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const backupConfig = getBackupConfig(envConfig);
		const domain = getDuckDnsDomain(envConfig);

		return {
			baseDir: envConfig.BASE_DIR,
			timezone: envConfig.TZ ?? "Etc/UTC",
			httpsEnabled: envConfig.ENABLE_HTTPS === "true",
			firewallEnabled: envConfig.ENABLE_FIREWALL === "true",
			acmeEmail: envConfig.ACME_EMAIL ?? "",
			duckdnsDomain: domain ?? "",
			backupDir: backupConfig.BACKUP_DIR,
			backupHour: backupConfig.BACKUP_HOUR,
			backupPassword: !!backupConfig.BACKUP_PASSWORD,
			localRetention: backupConfig.LOCAL_RETENTION,
			remoteRetention: backupConfig.REMOTE_RETENTION,
			remotes: backupConfig.RCLONE_REMOTES,
			puid: parseInt(envConfig.PUID ?? "1000", 10),
			pgid: parseInt(envConfig.PGID ?? "1000", 10),
		};
	},
);

export const fetchResources = createServerFn({ method: "GET" }).handler(
	async (): Promise<SystemResources> => {
		await ensureSession();

		// When running inside a container, local commands (nproc, free, df)
		// report container metrics. Use `docker info` and host /proc via
		// a helper container to get real host system info.

		// Get CPU info from /proc/cpuinfo (mounted read-only from host via /repo)
		// Fall back to docker info for core count
		let cpuModel = "Unknown";
		let cores = 1;
		const infoResult = await shell(
			"docker",
			["info", "--format", "{{.NCPU}}\t{{.MemTotal}}"],
			{ ignoreError: true, timeout: 5000 },
		);
		if (infoResult.exitCode === 0 && infoResult.stdout.trim()) {
			const parts = infoResult.stdout.trim().split("\t");
			cores = parseInt(parts[0] ?? "1", 10) || 1;
		}

		// CPU model from host /proc/cpuinfo (accessible since /proc is shared on Linux)
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

		// CPU usage — use docker stats to sum all container CPU usage as a proxy
		let cpuUsage = 0;
		const statsResult = await shell(
			"docker",
			["stats", "--no-stream", "--format", "{{.CPUPerc}}"],
			{ ignoreError: true, timeout: 10000 },
		);
		if (statsResult.exitCode === 0 && statsResult.stdout.trim()) {
			for (const line of statsResult.stdout.trim().split("\n")) {
				cpuUsage += parseFloat(line.replace("%", "")) || 0;
			}
			cpuUsage = Math.round(cpuUsage);
		}

		// Memory from docker info (reports host memory)
		let ramTotalGB = 0;
		let ramUsedGB = 0;
		if (infoResult.exitCode === 0 && infoResult.stdout.trim()) {
			const parts = infoResult.stdout.trim().split("\t");
			const memTotal = parseInt(parts[1] ?? "0", 10);
			ramTotalGB = Math.round((memTotal / 1024 ** 3) * 10) / 10;
		}
		// Get used memory from /proc/meminfo (shared with host on Linux)
		const memResult = await shell(
			"sh",
			[
				"-c",
				"cat /proc/meminfo 2>/dev/null | grep -E '^(MemTotal|MemAvailable):'",
			],
			{ ignoreError: true, timeout: 5000 },
		);
		if (memResult.exitCode === 0 && memResult.stdout.trim()) {
			let totalKB = 0;
			let availKB = 0;
			for (const line of memResult.stdout.trim().split("\n")) {
				const match = line.match(/^(\w+):\s+(\d+)/);
				if (match) {
					if (match[1] === "MemTotal") totalKB = parseInt(match[2], 10);
					if (match[1] === "MemAvailable") availKB = parseInt(match[2], 10);
				}
			}
			if (totalKB > 0) {
				ramTotalGB = Math.round((totalKB / 1024 ** 2) * 10) / 10;
				ramUsedGB = Math.round(((totalKB - availKB) / 1024 ** 2) * 10) / 10;
			}
		}

		// Disk — use docker system df for Docker disk usage, and host root via bind mount
		const mounts: SystemResources["mounts"] = [];
		const dfResult = await shell(
			"sh",
			["-c", "df -B1 --output=target,size,used / 2>/dev/null | tail -n +2"],
			{ ignoreError: true, timeout: 5000 },
		);
		if (dfResult.exitCode === 0 && dfResult.stdout.trim()) {
			for (const line of dfResult.stdout.trim().split("\n")) {
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 3) {
					mounts.push({
						path: "/",
						totalGB: Math.round((parseInt(parts[1], 10) / 1024 ** 3) * 10) / 10,
						usedGB: Math.round((parseInt(parts[2], 10) / 1024 ** 3) * 10) / 10,
					});
				}
			}
		}

		return { cpuModel, cores, cpuUsage, ramTotalGB, ramUsedGB, mounts };
	},
);

export const fetchVersion = createServerFn({ method: "GET" }).handler(
	async (): Promise<VersionInfo> => {
		await ensureSession();
		const projectRoot = getProjectRoot();

		// Read version from cli/package.json
		let version = "0.0.0";
		try {
			const pkgPath = resolve(projectRoot, "cli/package.json");
			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			version = pkg.version ?? "0.0.0";
		} catch {
			// ignore
		}

		// Get git commit
		let gitCommit = "unknown";
		const gitResult = await shell("git", ["rev-parse", "--short", "HEAD"], {
			cwd: projectRoot,
			ignoreError: true,
			timeout: 5000,
		});
		if (gitResult.exitCode === 0 && gitResult.stdout.trim()) {
			gitCommit = gitResult.stdout.trim();
		}

		// Get build date from git
		let buildDate = new Date().toISOString().split("T")[0];
		const dateResult = await shell("git", ["log", "-1", "--format=%ci"], {
			cwd: projectRoot,
			ignoreError: true,
			timeout: 5000,
		});
		if (dateResult.exitCode === 0 && dateResult.stdout.trim()) {
			buildDate = dateResult.stdout.trim().split(" ")[0];
		}

		return { version, gitCommit, buildDate };
	},
);

export const updateConfig = createServerFn({ method: "POST" })
	.inputValidator((d: { changes: Partial<SystemConfig> }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { changes } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		// Map UI config keys to .env keys
		if (changes.timezone !== undefined) envConfig.TZ = changes.timezone;
		if (changes.puid !== undefined) envConfig.PUID = String(changes.puid);
		if (changes.pgid !== undefined) envConfig.PGID = String(changes.pgid);
		if (changes.httpsEnabled !== undefined)
			envConfig.ENABLE_HTTPS = String(changes.httpsEnabled);
		if (changes.firewallEnabled !== undefined)
			envConfig.ENABLE_FIREWALL = String(changes.firewallEnabled);
		if (changes.acmeEmail !== undefined)
			envConfig.ACME_EMAIL = changes.acmeEmail;
		if (changes.backupDir !== undefined)
			envConfig.BACKUP_DIR = changes.backupDir;
		if (changes.backupHour !== undefined)
			envConfig.BACKUP_HOUR = String(changes.backupHour);
		if (changes.localRetention !== undefined)
			envConfig.LOCAL_RETENTION = String(changes.localRetention);
		if (changes.remoteRetention !== undefined)
			envConfig.REMOTE_RETENTION = String(changes.remoteRetention);

		await saveEnvConfig(envConfig, projectRoot);

		const changedKeys = Object.keys(changes).join(", ");
		await logActivity(
			"config_updated",
			"system",
			null,
			`Updated settings: ${changedKeys}`,
			"/settings",
		);
	});
