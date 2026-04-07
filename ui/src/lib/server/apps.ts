import type { AppDefinition } from "@mithrandir/cli/lib/apps";
import {
	APP_CATEGORIES,
	APP_REGISTRY,
	getAppDir,
	getComposePath,
	getContainerName,
} from "@mithrandir/cli/lib/apps";
import { regenerateCaddyfile } from "@mithrandir/cli/lib/caddy";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import {
	composeDown,
	composeUp,
	getRunningImageId,
	isContainerRunning,
	pullImage,
} from "@mithrandir/cli/lib/docker";
import { regenerateGatusConfig } from "@mithrandir/cli/lib/gatus";
import { shell } from "@mithrandir/cli/lib/shell";
import { getContainerStatus } from "@mithrandir/cli/lib/status";
import { createServerFn } from "@tanstack/react-start";
import { existsSync, readdirSync, readFileSync } from "fs";
import { ensureSession } from "#/lib/auth";
import type { AppCategory, AppDetail, DashboardApp } from "#/lib/types";
import { formatUptime, parseMemoryMB } from "../utils";
import { logActivity } from "./activity";
import { getProjectRoot } from "./utils";

/** Map CLI category value to UI AppCategory */
function mapCategory(app: AppDefinition): AppCategory {
	for (const cat of APP_CATEGORIES) {
		if (cat.apps.includes(app.name)) {
			return cat.value as AppCategory;
		}
	}
	return "utilities";
}

export const fetchApps = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardApp[]> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;

		const apps: DashboardApp[] = [];

		for (const app of APP_REGISTRY) {
			const composePath = getComposePath(app, baseDir);
			const installed = existsSync(composePath);

			let status: DashboardApp["status"] = "available";
			let uptime = "—";

			if (installed) {
				const containerName = getContainerName(app);
				const running = await isContainerRunning(containerName);

				if (running) {
					status = "running";
					const result = await shell(
						"docker",
						["inspect", "--format", "{{.State.StartedAt}}", containerName],
						{ sudo: true, ignoreError: true, timeout: 5000 },
					);
					if (result.exitCode === 0 && result.stdout.trim()) {
						uptime = formatUptime(result.stdout.trim());
					}
				} else {
					const statusStr = await getContainerStatus(app);
					status =
						statusStr === "exited" ||
						statusStr === "created" ||
						statusStr === "not found"
							? "stopped"
							: "error";
				}
			}

			const capacity = app.capacity ?? {
				performance: "low" as const,
				storage: "low" as const,
			};
			apps.push({
				name: app.name,
				displayName: app.displayName,
				description: app.description,
				port: app.port ?? 0,
				status,
				category: mapCategory(app),
				uptime,
				icon: app.icon,
				hidden: app.hidden ?? false,
				performanceScore: capacity.performance,
				storageScore: capacity.storage,
				capacityNote: capacity.note ?? undefined,
			});
		}

		return apps;
	},
);

export const fetchAppDetail = createServerFn({ method: "GET" })
	.inputValidator((d: { appName: string }) => d)
	.handler(async ({ data }): Promise<AppDetail | null> => {
		await ensureSession();
		const { appName } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;

		const app = APP_REGISTRY.find((a) => a.name === appName);
		if (!app) return null;

		const composePath = getComposePath(app, baseDir);
		const installed = existsSync(composePath);
		if (!installed) return null;

		const containerName = getContainerName(app);

		// Get container inspect data
		const inspectResult = await shell(
			"docker",
			["inspect", "--format", "{{json .}}", containerName],
			{ sudo: true, ignoreError: true, timeout: 10000 },
		);

		let status: DashboardApp["status"] = "stopped";
		let uptime = "—";
		let restarts = 0;
		let createdAt = "";
		let image = app.image;
		let version = "";

		if (inspectResult.exitCode === 0) {
			try {
				const info = JSON.parse(inspectResult.stdout.trim());
				const stateStatus = info.State?.Status;
				status =
					stateStatus === "running"
						? "running"
						: stateStatus === "exited"
							? "stopped"
							: "error";
				restarts = info.RestartCount ?? 0;
				createdAt = info.Created ?? "";
				image = info.Config?.Image ?? app.image;
				version =
					info.Config?.Labels?.["org.opencontainers.image.version"] ?? "";
				if (stateStatus === "running" && info.State?.StartedAt) {
					uptime = formatUptime(info.State.StartedAt);
				}
			} catch {
				// ignore parse errors
			}
		}

		// Get resource stats if running
		let cpuUsage = 0;
		let ramUsageMB = 0;
		let networkRx = "—";
		let networkTx = "—";

		if (status === "running") {
			const statsResult = await shell(
				"docker",
				[
					"stats",
					"--no-stream",
					"--format",
					"{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}",
					containerName,
				],
				{ sudo: true, ignoreError: true, timeout: 10000 },
			);
			if (statsResult.exitCode === 0 && statsResult.stdout.trim()) {
				const parts = statsResult.stdout.trim().split("\t");
				cpuUsage = parseFloat(parts[0]?.replace("%", "") ?? "0") || 0;
				const memParts = parts[1]?.split("/") ?? [];
				ramUsageMB = parseMemoryMB(memParts[0]?.trim() ?? "0");
				const netParts = parts[2]?.split("/") ?? [];
				networkRx = netParts[0]?.trim() ?? "—";
				networkTx = netParts[1]?.trim() ?? "—";
			}
		}

		// Get recent logs
		const logsResult = await shell(
			"docker",
			["logs", "--tail", "50", "--timestamps", containerName],
			{ sudo: true, ignoreError: true, timeout: 10000 },
		);
		const logs =
			logsResult.exitCode === 0
				? logsResult.stdout.trim().split("\n").filter(Boolean)
				: (logsResult.stderr?.trim().split("\n").filter(Boolean) ?? []);

		// Build volumes list
		const configPath = `${getAppDir(app, baseDir)}/${app.configSubdir}`;
		const volumes: string[] = [`${configPath}:/config`];
		if (app.needsDataDir) {
			volumes.push(`${baseDir}/data:/data${app.dataDirReadOnly ? ":ro" : ""}`);
		}

		return {
			name: app.name,
			displayName: app.displayName,
			description: app.description,
			port: app.port ?? 0,
			status,
			category: mapCategory(app),
			uptime,
			icon: app.icon,
			image,
			version,
			configPath,
			volumes,
			cpuUsage: Math.round(cpuUsage),
			ramUsageMB: Math.round(ramUsageMB),
			networkRx,
			networkTx,
			restarts,
			createdAt,
			logs,
		};
	});

export const startApp = createServerFn({ method: "POST" })
	.inputValidator((d: { appName: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { appName } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;

		const app = APP_REGISTRY.find((a) => a.name === appName);
		if (!app) throw new Error(`App not found: ${appName}`);

		const composePath = getComposePath(app, baseDir);
		if (!existsSync(composePath)) {
			throw new Error(`App not installed: ${appName}`);
		}

		await composeUp(composePath);
		await logActivity("started", "app", appName, `/apps/${appName}`);
	});

export const stopApp = createServerFn({ method: "POST" })
	.inputValidator((d: { appName: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { appName } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;

		const app = APP_REGISTRY.find((a) => a.name === appName);
		if (!app) throw new Error(`App not found: ${appName}`);

		const composePath = getComposePath(app, baseDir);
		if (!existsSync(composePath)) {
			throw new Error(`App not installed: ${appName}`);
		}

		await composeDown(composePath);
		await logActivity("stopped", "app", appName, `/apps/${appName}`);
	});

export const restartApp = createServerFn({ method: "POST" })
	.inputValidator((d: { appName: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { appName } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;

		const app = APP_REGISTRY.find((a) => a.name === appName);
		if (!app) throw new Error(`App not found: ${appName}`);

		const composePath = getComposePath(app, baseDir);
		if (!existsSync(composePath)) {
			throw new Error(`App not installed: ${appName}`);
		}

		await composeDown(composePath);
		await composeUp(composePath);
		await logActivity("restarted", "app", appName, `/apps/${appName}`);
	});

export const installApp = createServerFn({ method: "POST" })
	.inputValidator((d: { appName: string }) => d)
	.handler(async ({ data }): Promise<{ success: boolean; output: string }> => {
		await ensureSession();
		const { appName } = data;
		const projectRoot = getProjectRoot();

		const app = APP_REGISTRY.find((a) => a.name === appName);
		if (!app) throw new Error(`App not found: ${appName}`);

		const envConfig = await loadEnvConfig(projectRoot);
		const composePath = getComposePath(app, envConfig.BASE_DIR);
		if (existsSync(composePath)) {
			throw new Error(`App '${appName}' is already installed`);
		}

		const result = await shell(
			"/usr/local/bin/mithrandir",
			["install", appName, "--yes"],
			{ cwd: projectRoot, ignoreError: true, timeout: 300000 },
		);

		const success = (result.exitCode ?? 0) === 0;
		if (success) {
			await logActivity("installed", "app", appName, `/apps/${appName}`);
		}
		return {
			success,
			output: (result.stdout + result.stderr).trim(),
		};
	});

export const uninstallApp = createServerFn({ method: "POST" })
	.inputValidator((d: { appName: string; eraseData?: boolean }) => d)
	.handler(async ({ data }): Promise<{ success: boolean; output: string }> => {
		await ensureSession();
		const { appName, eraseData } = data;
		const projectRoot = getProjectRoot();

		const app = APP_REGISTRY.find((a) => a.name === appName);
		if (!app) throw new Error(`App not found: ${appName}`);

		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;
		const appDir = getAppDir(app, baseDir);

		// Stop and remove container + companions
		const composePath = getComposePath(app, baseDir);
		if (existsSync(composePath)) {
			await shell("docker", ["compose", "down", "--volumes"], {
				sudo: true,
				cwd: appDir,
				ignoreError: true,
			});
			await shell("docker", ["network", "prune", "-f"], {
				sudo: true,
				ignoreError: true,
			});
		}

		// Erase data if requested, otherwise just remove the compose file
		if (eraseData) {
			await shell("rm", ["-rf", appDir], { sudo: true });
		} else if (existsSync(composePath)) {
			await shell("rm", ["-f", composePath], { sudo: true });
		}

		// Regenerate Gatus health checks and Caddyfile to remove the uninstalled app
		if (appName !== "gatus") {
			try {
				await regenerateGatusConfig(envConfig);
			} catch {}
		}
		if (envConfig.ENABLE_HTTPS === "true") {
			try {
				await regenerateCaddyfile(envConfig);
			} catch {}
		}

		await logActivity("uninstalled", "app", appName, "/apps");
		return { success: true, output: `${app.displayName} uninstalled` };
	});

export const updateApp = createServerFn({ method: "POST" })
	.inputValidator((d: { appName: string }) => d)
	.handler(
		async ({
			data,
		}): Promise<{ updated: boolean; alreadyUpToDate: boolean }> => {
			await ensureSession();
			const { appName } = data;
			const projectRoot = getProjectRoot();
			const envConfig = await loadEnvConfig(projectRoot);
			const baseDir = envConfig.BASE_DIR;

			const app = APP_REGISTRY.find((a) => a.name === appName);
			if (!app) throw new Error(`App not found: ${appName}`);

			const composePath = getComposePath(app, baseDir);
			if (!existsSync(composePath)) {
				throw new Error(`App not installed: ${appName}`);
			}

			const containerName = getContainerName(app);
			const oldImageId = await getRunningImageId(containerName);
			const newImageId = await pullImage(app.image);

			if (oldImageId && oldImageId === newImageId) {
				return { updated: false, alreadyUpToDate: true };
			}

			await composeDown(composePath);
			await composeUp(composePath);
			await logActivity("updated", "app", appName, `/apps/${appName}`);
			return { updated: true, alreadyUpToDate: false };
		},
	);

export const fetchAppLogs = createServerFn({ method: "GET" })
	.inputValidator(
		(d: { appName: string; tail?: number; since?: string }) => d,
	)
	.handler(async ({ data }): Promise<string[]> => {
		await ensureSession();
		const { appName, tail = 100, since } = data;

		const app = APP_REGISTRY.find((a) => a.name === appName);
		if (!app) return [];

		const containerName = getContainerName(app);
		const args = [
			"logs",
			"--tail",
			String(tail),
			"--timestamps",
			containerName,
		];
		if (since) {
			args.splice(1, 0, "--since", since);
		}

		const result = await shell("docker", args, {
			sudo: true,
			ignoreError: true,
			timeout: 10000,
		});

		return result.exitCode === 0
			? result.stdout.trim().split("\n").filter(Boolean)
			: (result.stderr?.trim().split("\n").filter(Boolean) ?? []);
	});

export const fetchWireguardPeers = createServerFn({ method: "GET" }).handler(
	async (): Promise<string[]> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;

		const configDir = `${baseDir}/wireguard/config`;
		if (!existsSync(configDir)) return [];

		const entries = readdirSync(configDir, { withFileTypes: true });
		return entries
			.filter((e) => e.isDirectory() && /^peer\d+$/.test(e.name))
			.map((e) => e.name)
			.sort((a, b) => {
				const numA = Number.parseInt(a.replace("peer", ""), 10);
				const numB = Number.parseInt(b.replace("peer", ""), 10);
				return numA - numB;
			});
	},
);

export const fetchWireguardPeerQR = createServerFn({ method: "GET" })
	.inputValidator((d: { peer: string }) => d)
	.handler(async ({ data }): Promise<string | null> => {
		await ensureSession();
		const { peer } = data;

		// Validate peer name to prevent path traversal
		if (!/^peer\d+$/.test(peer)) return null;

		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const baseDir = envConfig.BASE_DIR;

		const pngPath = `${baseDir}/wireguard/config/${peer}/${peer}.png`;
		if (!existsSync(pngPath)) return null;

		const buf = readFileSync(pngPath);
		return `data:image/png;base64,${buf.toString("base64")}`;
	});
