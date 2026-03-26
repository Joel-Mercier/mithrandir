import {
	APP_REGISTRY,
	getApp,
	getAppDir,
	getComposePath,
	getConfigPaths,
	getContainerName,
} from "@mithrandir/cli/lib/apps";
import {
	generate404Page,
	generateCaddyDockerfile,
	generateCaddyfile,
	getDuckDnsDomain,
} from "@mithrandir/cli/lib/caddy";
import { generateCompose } from "@mithrandir/cli/lib/compose";
import {
	getBackupConfig,
	loadEnvConfig,
	saveEnvConfig,
} from "@mithrandir/cli/lib/config";
import { getLocalIp } from "@mithrandir/cli/lib/distro";
import {
	composeDown,
	composeUp,
	isContainerRunning,
	isDockerInstalled,
} from "@mithrandir/cli/lib/docker";
import { runHealthChecks } from "@mithrandir/cli/lib/health";
import { shell } from "@mithrandir/cli/lib/shell";
import { gatherSystemInfo } from "@mithrandir/cli/lib/status";
import {
	createRemote,
	deleteRemote,
	getRemoteType,
	isRcloneInstalled,
	isRcloneRemoteConfigured,
	isRemoteReachable,
	obscurePassword,
} from "@mithrandir/cli/lib/rclone";
import { getSwapInfo, formatSwapSize } from "@mithrandir/cli/lib/swap";
import { isTimerActive } from "@mithrandir/cli/lib/systemd";
import {
	enableUfw,
	installUfw,
	installUfwDocker,
	isUfwActive,
	isUfwDockerInstalled,
	isUfwInstalled,
	syncAllAppPorts,
} from "@mithrandir/cli/lib/ufw";
import { createServerFn } from "@tanstack/react-start";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { ensureSession } from "#/lib/auth";
import type {
	DoctorCheckResult,
	DoctorResult,
	FirewallPrerequisites,
	FirewallRule,
	HealthStatus,
	HttpsPrerequisites,
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
		const gitResult = await shell(
			"git",
			["-c", `safe.directory=${projectRoot}`, "rev-parse", "--short", "HEAD"],
			{ cwd: projectRoot, ignoreError: true, timeout: 5000 },
		);
		if (gitResult.exitCode === 0 && gitResult.stdout.trim()) {
			gitCommit = gitResult.stdout.trim();
		}

		// Get build date from git
		let buildDate = new Date().toISOString().split("T")[0];
		const dateResult = await shell(
			"git",
			["-c", `safe.directory=${projectRoot}`, "log", "-1", "--format=%ci"],
			{ cwd: projectRoot, ignoreError: true, timeout: 5000 },
		);
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

// ─── HTTPS ───────────────────────────────────────────────────────────────────

export const checkHttpsPrerequisites = createServerFn({
	method: "GET",
}).handler(async (): Promise<HttpsPrerequisites> => {
	await ensureSession();
	const projectRoot = getProjectRoot();
	const envConfig = await loadEnvConfig(projectRoot);

	const duckdnsConfigured = !!(
		envConfig.DUCKDNS_TOKEN && envConfig.DUCKDNS_SUBDOMAINS
	);

	const duckdnsApp = getApp("duckdns");
	const duckdnsInstalled = duckdnsApp
		? existsSync(getComposePath(duckdnsApp, envConfig.BASE_DIR))
		: false;

	const duckdnsRunning = duckdnsInstalled
		? await isContainerRunning("duckdns")
		: false;

	const domain = getDuckDnsDomain(envConfig);

	return {
		duckdnsConfigured,
		duckdnsInstalled,
		duckdnsRunning,
		domain,
		ready: duckdnsConfigured && duckdnsInstalled && duckdnsRunning && !!domain,
	};
});

export const enableHttps = createServerFn({ method: "POST" })
	.inputValidator((d: { acmeEmail: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { acmeEmail } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		// Validate prerequisites
		if (!envConfig.DUCKDNS_TOKEN || !envConfig.DUCKDNS_SUBDOMAINS) {
			throw new Error("DuckDNS is not configured");
		}
		const domain = getDuckDnsDomain(envConfig);
		if (!domain) {
			throw new Error("Could not derive domain from DUCKDNS_SUBDOMAINS");
		}

		const caddyApp = getApp("caddy");
		if (!caddyApp) throw new Error("Caddy app not found in registry");

		const baseDir = envConfig.BASE_DIR;
		const caddyDir = getAppDir(caddyApp, baseDir);

		// Save config
		envConfig.ACME_EMAIL = acmeEmail;
		envConfig.ENABLE_HTTPS = "true";

		// Create directories
		await shell("mkdir", ["-p", caddyDir], { sudo: true });
		await shell("mkdir", ["-p", `${caddyDir}/config`], { sudo: true });
		await shell("mkdir", ["-p", `${caddyDir}/data`], { sudo: true });
		await shell("mkdir", ["-p", `${caddyDir}/srv`], { sudo: true });

		// Build Caddy Docker image with DuckDNS module
		const dockerfile = generateCaddyDockerfile();
		await shell(
			"bash",
			[
				"-c",
				`cat > "${caddyDir}/Dockerfile" << 'DOCKERFILE_EOF'\n${dockerfile}DOCKERFILE_EOF`,
			],
			{ sudo: true },
		);
		await shell(
			"docker",
			[
				"build",
				"-t",
				"mithrandir/caddy-duckdns:latest",
				"-f",
				`${caddyDir}/Dockerfile`,
				caddyDir,
			],
			{ sudo: true, timeout: 300000 },
		);

		// Generate Caddyfile from all installed apps
		const installedApps = APP_REGISTRY.filter((app) =>
			existsSync(getComposePath(app, baseDir)),
		);
		const caddyfile = generateCaddyfile(installedApps, envConfig);
		const page404 = generate404Page(installedApps, envConfig);
		await shell(
			"bash",
			[
				"-c",
				`cat > "${caddyDir}/Caddyfile" << 'CADDY_EOF'\n${caddyfile}CADDY_EOF`,
			],
			{ sudo: true },
		);
		await shell(
			"bash",
			[
				"-c",
				`cat > "${caddyDir}/srv/404.html" << 'HTML_EOF'\n${page404}HTML_EOF`,
			],
			{ sudo: true },
		);

		// Generate compose and start Caddy
		const compose = caddyApp.rawCompose!(envConfig as Record<string, string>);
		const composePath = getComposePath(caddyApp, baseDir);
		await shell(
			"bash",
			["-c", `cat > "${composePath}" << 'COMPOSE_EOF'\n${compose}COMPOSE_EOF`],
			{ sudo: true },
		);
		await composeDown(composePath).catch(() => {});
		await composeUp(composePath);

		// Handle Pi-hole if installed (port conflict + wildcard DNS)
		const piholeApp = getApp("pihole");
		if (piholeApp) {
			const piholeCompose = getComposePath(piholeApp, baseDir);
			if (existsSync(piholeCompose)) {
				const piholeComposeContent = generateCompose(
					piholeApp,
					envConfig as Record<string, string | undefined>,
				);
				await shell(
					"bash",
					[
						"-c",
						`cat > "${piholeCompose}" << 'COMPOSE_EOF'\n${piholeComposeContent}COMPOSE_EOF`,
					],
					{ sudo: true },
				);

				const localIp = await getLocalIp().catch(() => "localhost");
				const dnsmasqDir = `${baseDir}/pihole/config/dnsmasq.d`;
				await shell("mkdir", ["-p", dnsmasqDir], { sudo: true });
				await shell(
					"bash",
					[
						"-c",
						`echo "address=/*.${domain}/${localIp}" > "${dnsmasqDir}/99-wildcard.conf"`,
					],
					{ sudo: true },
				);

				await composeDown(piholeCompose).catch(() => {});
				await composeUp(piholeCompose);
			}
		}

		await saveEnvConfig(envConfig, projectRoot);

		await logActivity(
			"https_enabled",
			"system",
			null,
			`Enabled HTTPS with Caddy (${domain})`,
			"/settings",
		);
	});

export const disableHttps = createServerFn({ method: "POST" }).handler(
	async () => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		const caddyApp = getApp("caddy");
		if (!caddyApp) throw new Error("Caddy app not found in registry");

		const baseDir = envConfig.BASE_DIR;
		const composePath = getComposePath(caddyApp, baseDir);

		// Stop Caddy container
		if (existsSync(composePath)) {
			await composeDown(composePath).catch(() => {});
		}

		// Update config
		envConfig.ENABLE_HTTPS = "false";
		await saveEnvConfig(envConfig, projectRoot);

		// Regenerate Pi-hole compose to restore port 443
		const piholeApp = getApp("pihole");
		if (piholeApp) {
			const piholeCompose = getComposePath(piholeApp, baseDir);
			if (existsSync(piholeCompose)) {
				const piholeComposeContent = generateCompose(
					piholeApp,
					envConfig as Record<string, string | undefined>,
				);
				await shell(
					"bash",
					[
						"-c",
						`cat > "${piholeCompose}" << 'COMPOSE_EOF'\n${piholeComposeContent}COMPOSE_EOF`,
					],
					{ sudo: true },
				);
				await composeDown(piholeCompose).catch(() => {});
				await composeUp(piholeCompose);
			}
		}

		await logActivity(
			"https_disabled",
			"system",
			null,
			"Disabled HTTPS and stopped Caddy",
			"/settings",
		);
	},
);

// ─── Firewall ─────────────────────────────────────────────────────────────────

export const checkFirewallPrerequisites = createServerFn({
	method: "GET",
}).handler(async (): Promise<FirewallPrerequisites> => {
	await ensureSession();

	const ufwInstalled = await isUfwInstalled().catch(() => false);
	const ufwDockerInstalled = await isUfwDockerInstalled().catch(() => false);
	const ufwActive = ufwInstalled
		? await isUfwActive().catch(() => false)
		: false;

	return {
		ufwInstalled,
		ufwDockerInstalled,
		ufwActive,
		ready: ufwInstalled && ufwDockerInstalled && ufwActive,
	};
});

export const fetchFirewallRules = createServerFn({ method: "GET" }).handler(
	async (): Promise<FirewallRule[]> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const rules: FirewallRule[] = [];

		// Get installed apps and their ports
		const installedApps = APP_REGISTRY.filter((app) =>
			existsSync(getComposePath(app, envConfig.BASE_DIR)),
		);

		for (const app of installedApps) {
			const isHostNetwork = app.networkMode === "host";
			if (app.port) {
				rules.push({
					port: app.port,
					protocol: "tcp",
					app: app.name,
					type: isHostNetwork ? "ufw" : "ufw-docker",
				});
			}
			if (app.extraPorts) {
				for (const ep of app.extraPorts) {
					rules.push({
						port: ep.host,
						protocol: ep.protocol ?? "tcp",
						app: app.name,
						type: isHostNetwork ? "ufw" : "ufw-docker",
					});
				}
			}
		}

		// Always include SSH
		rules.unshift({
			port: 22,
			protocol: "tcp",
			app: "SSH",
			type: "ufw",
		});

		return rules;
	},
);

export const enableFirewall = createServerFn({ method: "POST" }).handler(
	async () => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		// Install UFW if needed
		const ufwInstalled = await isUfwInstalled().catch(() => false);
		if (!ufwInstalled) {
			await installUfw();
		}

		// Install ufw-docker if needed
		const ufwDockerInstalled = await isUfwDockerInstalled().catch(() => false);
		if (!ufwDockerInstalled) {
			await installUfwDocker();
		}

		// Enable UFW if not active
		const ufwActive = await isUfwActive().catch(() => false);
		if (!ufwActive) {
			await enableUfw();
		}

		// Sync rules for all installed apps
		const installedApps = APP_REGISTRY.filter((app) =>
			existsSync(getComposePath(app, envConfig.BASE_DIR)),
		);
		if (installedApps.length > 0) {
			await syncAllAppPorts(installedApps);
		}

		// Save to .env
		envConfig.ENABLE_FIREWALL = "true";
		await saveEnvConfig(envConfig, projectRoot);

		await logActivity(
			"firewall_enabled",
			"system",
			null,
			"Enabled UFW firewall with ufw-docker",
			"/settings",
		);
	},
);

export const disableFirewall = createServerFn({ method: "POST" }).handler(
	async () => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		// Disable UFW
		await shell("ufw", ["--force", "disable"], {
			sudo: true,
			ignoreError: true,
		});

		// Save to .env
		envConfig.ENABLE_FIREWALL = "false";
		await saveEnvConfig(envConfig, projectRoot);

		await logActivity(
			"firewall_disabled",
			"system",
			null,
			"Disabled UFW firewall",
			"/settings",
		);
	},
);

// ─── Backup Remotes ───────────────────────────────────────────────────────────

export const checkRcloneInstalled = createServerFn({ method: "GET" }).handler(
	async (): Promise<boolean> => {
		await ensureSession();
		return isRcloneInstalled();
	},
);

export const addBackupRemote = createServerFn({ method: "POST" })
	.inputValidator(
		(d: {
			name: string;
			providerType: string;
			params: Record<string, string>;
		}) => d,
	)
	.handler(async ({ data }) => {
		await ensureSession();
		const { name, providerType, params } = data;

		// Validate remote name
		if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
			throw new Error(
				"Remote name can only contain letters, numbers, hyphens, and underscores",
			);
		}

		// For iCloud Drive, obscure the password
		const finalParams = { ...params };
		if (providerType === "iclouddrive" && finalParams.password) {
			finalParams.password = await obscurePassword(finalParams.password);
		}

		// Filter out empty values
		const filtered: Record<string, string> = {};
		for (const [k, v] of Object.entries(finalParams)) {
			if (v) filtered[k] = v;
		}

		// Create the rclone remote
		await createRemote(name, providerType, filtered);

		// Test connectivity
		const reachable = await isRemoteReachable(name);

		// Add to RCLONE_REMOTES in .env
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const backupConfig = getBackupConfig(envConfig);
		const currentRemotes = backupConfig.RCLONE_REMOTES;
		if (!currentRemotes.includes(name)) {
			const newRemotes = [...currentRemotes, name].join(",");
			envConfig.RCLONE_REMOTES = newRemotes;
			delete envConfig.RCLONE_REMOTE;
			await saveEnvConfig(envConfig, projectRoot);
		}

		await logActivity(
			"remote_added",
			"system",
			null,
			`Added backup remote '${name}' (${providerType})`,
			"/settings",
		);

		return { reachable };
	});

export const removeBackupRemote = createServerFn({ method: "POST" })
	.inputValidator(
		(d: { name: string; deleteFromRclone: boolean }) => d,
	)
	.handler(async ({ data }) => {
		await ensureSession();
		const { name, deleteFromRclone: shouldDeleteFromRclone } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const backupConfig = getBackupConfig(envConfig);

		// Remove from RCLONE_REMOTES
		const newRemotes = backupConfig.RCLONE_REMOTES.filter((r) => r !== name);
		if (newRemotes.length > 0) {
			envConfig.RCLONE_REMOTES = newRemotes.join(",");
		} else {
			delete envConfig.RCLONE_REMOTES;
		}
		if (envConfig.RCLONE_REMOTE === name) {
			delete envConfig.RCLONE_REMOTE;
		}
		await saveEnvConfig(envConfig, projectRoot);

		// Optionally remove from rclone.conf
		if (shouldDeleteFromRclone) {
			try {
				await deleteRemote(name);
			} catch {
				// Ignore errors deleting from rclone.conf
			}
		}

		await logActivity(
			"remote_removed",
			"system",
			null,
			`Removed backup remote '${name}'`,
			"/settings",
		);
	});

export const fetchRemoteDetails = createServerFn({ method: "GET" }).handler(
	async (): Promise<
		{ name: string; type: string | null; reachable: boolean | null }[]
	> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const backupConfig = getBackupConfig(envConfig);
		const results: {
			name: string;
			type: string | null;
			reachable: boolean | null;
		}[] = [];

		for (const name of backupConfig.RCLONE_REMOTES) {
			const type = await getRemoteType(name);
			let reachable: boolean | null = null;
			try {
				reachable = await isRemoteReachable(name);
			} catch {
				reachable = false;
			}
			results.push({ name, type, reachable });
		}

		return results;
	},
);

// ─── Doctor ───────────────────────────────────────────────────────────────────

export const runDoctor = createServerFn({ method: "GET" }).handler(
	async (): Promise<DoctorResult> => {
		await ensureSession();
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);
		const backupConfig = getBackupConfig(envConfig);
		const baseDir = envConfig.BASE_DIR;

		const results: DoctorCheckResult[] = [];

		// ── System checks ──

		// .env file
		const envPath = resolve(projectRoot, ".env");
		results.push(
			existsSync(envPath)
				? {
						category: "System",
						name: ".env file",
						status: "pass",
						message: "Found",
					}
				: {
						category: "System",
						name: ".env file",
						status: "fail",
						message: "Missing",
						hint: "Run `mithrandir setup` to create it",
					},
		);

		// Docker
		const dockerInstalled = await isDockerInstalled();
		if (!dockerInstalled) {
			results.push({
				category: "System",
				name: "Docker",
				status: "fail",
				message: "Not installed",
				hint: "Run `mithrandir install docker` to install it",
			});
		} else {
			const dockerInfo = await shell("docker", ["info"], {
				sudo: true,
				ignoreError: true,
			});
			results.push(
				dockerInfo.exitCode !== 0
					? {
							category: "System",
							name: "Docker",
							status: "fail",
							message: "Installed but daemon not running",
							hint: "Run `sudo systemctl start docker`",
						}
					: {
							category: "System",
							name: "Docker",
							status: "pass",
							message: "Installed and running",
						},
			);
		}

		// Swap
		const swapInfo = await getSwapInfo();
		if (!swapInfo) {
			results.push({
				category: "System",
				name: "Swap",
				status: "fail",
				message: "No swap configured",
				hint: "Run `mithrandir install docker` to configure swap",
			});
		} else {
			const sizeStr = formatSwapSize(swapInfo.totalBytes);
			const oneGB = 1024 * 1024 * 1024;
			results.push(
				swapInfo.totalBytes < oneGB
					? {
							category: "System",
							name: "Swap",
							status: "warn",
							message: `${sizeStr} configured (recommend >= 2 GB)`,
							hint: "Run `mithrandir install docker` to configure 2 GB swap",
						}
					: {
							category: "System",
							name: "Swap",
							status: "pass",
							message: `${sizeStr} configured`,
						},
			);
		}

		// Firewall
		if (envConfig.ENABLE_FIREWALL !== "true") {
			results.push({
				category: "System",
				name: "Firewall",
				status: "warn",
				message: "Not enabled",
				hint: "Run `mithrandir install firewall` to set up UFW",
			});
		} else {
			const ufwInst = await isUfwInstalled().catch(() => false);
			if (!ufwInst) {
				results.push({
					category: "System",
					name: "Firewall",
					status: "fail",
					message: "ENABLE_FIREWALL=true but UFW is not installed",
					hint: "Run `mithrandir install firewall`",
				});
			} else {
				const active = await isUfwActive().catch(() => false);
				if (!active) {
					results.push({
						category: "System",
						name: "Firewall",
						status: "fail",
						message: "UFW is installed but not active",
						hint: "Run `mithrandir install firewall`",
					});
				} else {
					const ufwDocker = await isUfwDockerInstalled().catch(
						() => false,
					);
					results.push(
						ufwDocker
							? {
									category: "System",
									name: "Firewall",
									status: "pass",
									message: "UFW active with ufw-docker",
								}
							: {
									category: "System",
									name: "Firewall",
									status: "fail",
									message:
										"UFW is active but ufw-docker is not installed",
									hint: "Run `mithrandir install firewall`",
								},
					);
				}
			}
		}

		// ── App checks ──

		const installedApps = APP_REGISTRY.filter((app) =>
			existsSync(getComposePath(app, baseDir)),
		);

		// Stopped containers
		if (installedApps.length === 0) {
			results.push({
				category: "Apps",
				name: "Stopped containers",
				status: "pass",
				message: "No apps installed",
			});
		} else {
			const stopped: string[] = [];
			for (const app of installedApps) {
				const containerName = getContainerName(app);
				const inspectResult = await shell(
					"docker",
					[
						"inspect",
						"--format",
						"{{.State.Status}}",
						containerName,
					],
					{ sudo: true, ignoreError: true },
				);
				if (inspectResult.exitCode !== 0) {
					stopped.push(app.name);
				} else if (inspectResult.stdout.trim() !== "running") {
					stopped.push(app.name);
				}
			}
			results.push(
				stopped.length > 0
					? {
							category: "Apps",
							name: "Stopped containers",
							status: "warn",
							message: stopped.join(", "),
							hint: "Run `mithrandir start <app>` to start them",
						}
					: {
							category: "Apps",
							name: "Stopped containers",
							status: "pass",
							message: "All running",
						},
			);
		}

		// Config directories
		if (installedApps.length === 0) {
			results.push({
				category: "Apps",
				name: "Config directories",
				status: "pass",
				message: "No apps installed",
			});
		} else {
			const missing: string[] = [];
			for (const app of installedApps) {
				for (const p of getConfigPaths(app, baseDir)) {
					if (!existsSync(p)) missing.push(`${app.name}: ${p}`);
				}
			}
			results.push(
				missing.length > 0
					? {
							category: "Apps",
							name: "Config directories",
							status: "warn",
							message: missing.join(", "),
							hint: "Run `mithrandir reinstall <app>` to recreate missing directories",
						}
					: {
							category: "Apps",
							name: "Config directories",
							status: "pass",
							message: "All present",
						},
			);
		}

		// Secrets
		const missingRequired: string[] = [];
		const missingOptional: string[] = [];
		for (const app of installedApps) {
			if (!app.secrets) continue;
			for (const secret of app.secrets) {
				const value = envConfig[secret.envVar];
				if (!value || value.trim() === "") {
					if (secret.required) {
						missingRequired.push(
							`${secret.envVar} (${app.name})`,
						);
					} else {
						missingOptional.push(
							`${secret.envVar} (${app.name})`,
						);
					}
				}
			}
		}
		results.push(
			missingRequired.length > 0
				? {
						category: "Apps",
						name: "Required secrets",
						status: "fail",
						message: missingRequired.join(", "),
						hint: "Run `mithrandir setup` to configure secrets",
					}
				: {
						category: "Apps",
						name: "Required secrets",
						status: "pass",
						message: "All set",
					},
		);
		results.push(
			missingOptional.length > 0
				? {
						category: "Apps",
						name: "Optional secrets",
						status: "warn",
						message: missingOptional.join(", "),
						hint: "Run `mithrandir setup` to configure secrets",
					}
				: {
						category: "Apps",
						name: "Optional secrets",
						status: "pass",
						message: "All set",
					},
		);

		// ── Backup checks (skip if no apps installed) ──

		if (installedApps.length > 0) {
			// Backup directory
			results.push(
				existsSync(backupConfig.BACKUP_DIR)
					? {
							category: "Backup",
							name: "Backup directory",
							status: "pass",
							message: `${backupConfig.BACKUP_DIR} exists`,
						}
					: {
							category: "Backup",
							name: "Backup directory",
							status: "fail",
							message: `${backupConfig.BACKUP_DIR} missing`,
							hint: "Run `mithrandir install backup`",
						},
			);

			// Systemd service
			results.push(
				existsSync("/etc/systemd/system/homelab-backup.service")
					? {
							category: "Backup",
							name: "Systemd service",
							status: "pass",
							message: "Installed",
						}
					: {
							category: "Backup",
							name: "Systemd service",
							status: "fail",
							message: "Missing",
							hint: "Run `mithrandir install backup`",
						},
			);

			// Systemd timer
			const timerActive = await isTimerActive().catch(() => false);
			results.push(
				timerActive
					? {
							category: "Backup",
							name: "Backup timer",
							status: "pass",
							message: "Active",
						}
					: {
							category: "Backup",
							name: "Backup timer",
							status: "fail",
							message: "Not active",
							hint: "Run `mithrandir install backup`",
						},
			);

			// rclone
			const rcloneInst = await isRcloneInstalled();
			if (!rcloneInst) {
				results.push({
					category: "Backup",
					name: "rclone",
					status: "fail",
					message: "Not installed",
					hint: "Run `mithrandir install backup`",
				});
			} else {
				for (const remote of backupConfig.RCLONE_REMOTES) {
					const configured = await isRcloneRemoteConfigured(
						remote,
						envConfig,
					);
					results.push(
						configured.configured
							? {
									category: "Backup",
									name: `rclone (${remote})`,
									status: "pass",
									message: "Configured",
								}
							: {
									category: "Backup",
									name: `rclone (${remote})`,
									status: "fail",
									message: "Not configured",
									hint: "Run `mithrandir backup remote add`",
								},
					);
				}
			}
		}

		const issueCount = results.filter(
			(r) => r.status === "fail" || r.status === "warn",
		).length;
		const hasFail = results.some((r) => r.status === "fail");

		return { checks: results, issueCount, hasFail };
	},
);
