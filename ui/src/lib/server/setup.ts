import type { AppDefinition } from "@mithrandir/cli/lib/apps";
import {
	APP_CATEGORIES,
	APP_REGISTRY,
	getAllContainerNames,
	getApp,
	getAppDir,
	getCompanionApps,
	getComposePath,
	getConfigPaths,
} from "@mithrandir/cli/lib/apps";
import {
	generate404Page,
	generateCaddyDockerfile,
	generateCaddyfile,
	getDuckDnsDomain,
} from "@mithrandir/cli/lib/caddy";
import {
	generateCompose,
	generateGatusExtraHosts,
} from "@mithrandir/cli/lib/compose";
import { loadEnvConfig, saveEnvConfig } from "@mithrandir/cli/lib/config";
import { getLocalIp } from "@mithrandir/cli/lib/distro";
import {
	composeDown,
	composeUp,
	installDocker,
	isDockerInstalled,
	pullImage,
	removeContainer,
	waitForDocker,
} from "@mithrandir/cli/lib/docker";
import { generateGatusConfig } from "@mithrandir/cli/lib/gatus";
import {
	createJellyfinClient,
	getJellyfinApiKey,
} from "@mithrandir/cli/lib/jellyfin";
import {
	createLidarrClient,
	getLidarrApiKey,
} from "@mithrandir/cli/lib/lidarr";
import {
	createProwlarrClient,
	getProwlarrApiKey,
} from "@mithrandir/cli/lib/prowlarr";
// Auto-setup API clients
import {
	createQBittorrentClient,
	getQBittorrentCredentials,
} from "@mithrandir/cli/lib/qbittorrent";
import {
	createRadarrClient,
	getRadarrApiKey,
} from "@mithrandir/cli/lib/radarr";
import { installRclone, isRcloneInstalled } from "@mithrandir/cli/lib/rclone";
import { createSeerrClient, getSeerrApiKey } from "@mithrandir/cli/lib/seerr";
import { shell } from "@mithrandir/cli/lib/shell";
import {
	createSonarrClient,
	getSonarrApiKey,
} from "@mithrandir/cli/lib/sonarr";
import {
	ensureSwap,
	formatSwapSize,
	getSwapInfo,
} from "@mithrandir/cli/lib/swap";
import { hasSystemd, installSystemdUnits } from "@mithrandir/cli/lib/systemd";
import {
	enableUfw,
	installUfw,
	installUfwDocker,
	isUfwActive,
	isUfwInstalled,
	syncAllAppPorts,
} from "@mithrandir/cli/lib/ufw";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { existsSync } from "fs";
import { systemSettings } from "#/db/schema";
import { ensureSession } from "#/lib/auth";
import db from "#/lib/db";
import { logActivity } from "./activity";
import { getProjectRoot } from "./utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckStatus = "checking" | "installed" | "missing";

export type SetupStatus = "pending" | "started" | "completed" | "skipped";

interface SystemRequirements {
	docker: CheckStatus;
	swap: CheckStatus;
	swapSize: string;
	rclone: CheckStatus;
	localIp: string;
}

export interface AppRegistryEntry {
	name: string;
	displayName: string;
	description: string;
	icon?: string;
	port: number | null;
	category: string;
	hidden: boolean;
	requiresHttps: boolean;
	secrets: Array<{
		envVar: string;
		prompt: string;
		sensitive: boolean;
		required: boolean;
		generate?: string;
	}>;
}

export interface AppCategoryEntry {
	label: string;
	value: string;
	description: string;
	apps: string[];
}

// ─── Setup status ────────────────────────────────────────────────────────────

export const fetchSetupStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ status: SetupStatus }> => {
		const row = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.key, "setup_status"))
			.get();
		if (!row) return { status: "pending" };
		const val = row.value as SetupStatus;
		if (["pending", "started", "completed", "skipped"].includes(val)) {
			return { status: val };
		}
		return { status: "pending" };
	},
);

// ─── System requirements ─────────────────────────────────────────────────────

export const checkSystemRequirements = createServerFn({
	method: "GET",
}).handler(async (): Promise<SystemRequirements> => {
	await ensureSession();

	const [dockerInstalled, swapInfo, rcloneInstalled, localIpAddr] =
		await Promise.all([
			isDockerInstalled().catch(() => false),
			getSwapInfo().catch(() => null),
			isRcloneInstalled().catch(() => false),
			getLocalIp().catch(() => "localhost"),
		]);

	const GB = 1024 * 1024 * 1024;
	const swapOk = swapInfo !== null && swapInfo.totalBytes >= 2 * GB;

	return {
		docker: dockerInstalled ? "installed" : "missing",
		swap: swapOk ? "installed" : swapInfo ? "missing" : "missing",
		swapSize: swapInfo ? formatSwapSize(swapInfo.totalBytes) : "0 MB",
		rclone: rcloneInstalled ? "installed" : "missing",
		localIp: localIpAddr,
	};
});

export const installSystemDep = createServerFn({ method: "POST" })
	.inputValidator((d: { dep: "docker" | "swap" | "rclone" }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { dep } = data;

		switch (dep) {
			case "docker":
				await installDocker();
				await waitForDocker(10, 2000);
				break;
			case "swap":
				await ensureSwap(2);
				break;
			case "rclone":
				await installRclone();
				break;
		}

		await logActivity(
			"setup_installed",
			"system",
			dep,
			`Installed ${dep} during setup`,
			"/setup",
		);
	});

// ─── Base directory ──────────────────────────────────────────────────────────

export const setupBaseDir = createServerFn({ method: "POST" })
	.inputValidator((d: { baseDir: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { baseDir } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		// Mark setup as started
		await upsertSetupStatus("started");

		// Create standard directory structure
		const dirs = [
			`${baseDir}/data/downloads/movies`,
			`${baseDir}/data/downloads/tv`,
			`${baseDir}/data/downloads/music`,
			`${baseDir}/data/media/movies`,
			`${baseDir}/data/media/tv`,
			`${baseDir}/data/media/music`,
			`${baseDir}/data/media/pictures`,
		];

		for (const dir of dirs) {
			await shell("mkdir", ["-p", dir], { sudo: true });
		}

		// Set ownership
		const puid = envConfig.PUID ?? "1000";
		const pgid = envConfig.PGID ?? "1000";
		await shell("chown", ["-R", `${puid}:${pgid}`, `${baseDir}/data`], {
			sudo: true,
			ignoreError: true,
		});

		// Save to .env
		envConfig.BASE_DIR = baseDir;
		await saveEnvConfig(envConfig, projectRoot);

		await logActivity(
			"setup_basedir",
			"system",
			null,
			`Set base directory to ${baseDir}`,
			"/setup",
		);
	});

// ─── App registry ────────────────────────────────────────────────────────────

export const fetchAppRegistry = createServerFn({ method: "GET" }).handler(
	async (): Promise<{
		apps: AppRegistryEntry[];
		categories: AppCategoryEntry[];
	}> => {
		await ensureSession();

		const apps: AppRegistryEntry[] = APP_REGISTRY.map((app) => ({
			name: app.name,
			displayName: app.displayName,
			description: app.description,
			icon: app.icon,
			port: app.port,
			category: findCategory(app.name),
			hidden: app.hidden ?? false,
			requiresHttps: app.requiresHttps ?? false,
			secrets: (app.secrets ?? []).map((s) => ({
				envVar: s.envVar,
				prompt: s.prompt,
				sensitive: s.sensitive ?? false,
				required: s.required ?? false,
				generate: s.generate,
			})),
		}));

		const categories: AppCategoryEntry[] = APP_CATEGORIES.map((cat) => ({
			label: cat.label,
			value: cat.value,
			description: cat.description,
			apps: cat.apps,
		}));

		return { apps, categories };
	},
);

function findCategory(appName: string): string {
	for (const cat of APP_CATEGORIES) {
		if (cat.apps.includes(appName)) return cat.value;
	}
	return "utilities";
}

// ─── Resolve dependencies ────────────────────────────────────────────────────

export const resolveAppDependencies = createServerFn({ method: "POST" })
	.inputValidator((d: { selectedApps: string[] }) => d)
	.handler(
		async ({ data }): Promise<{ resolved: string[]; autoAdded: string[] }> => {
			await ensureSession();
			const { selectedApps } = data;

			// Hardcoded dependencies (mirrors cli/src/commands/setup.tsx)
			const APP_DEPS: Record<string, string[]> = {
				caddy: ["duckdns", "pihole"],
				vaultwarden: ["caddy", "duckdns", "pihole"],
			};

			const resolved = new Set(selectedApps);
			const autoAdded: string[] = [];

			for (const appName of selectedApps) {
				const deps = APP_DEPS[appName];
				if (deps) {
					for (const dep of deps) {
						if (!resolved.has(dep)) {
							resolved.add(dep);
							autoAdded.push(dep);
						}
					}
				}
				// Add companion apps
				try {
					const companions = getCompanionApps(appName);
					for (const comp of companions) {
						if (!resolved.has(comp.name)) {
							resolved.add(comp.name);
							autoAdded.push(comp.name);
						}
					}
				} catch {
					// getCompanionApps may not exist for all apps
				}
			}

			return { resolved: [...resolved], autoAdded };
		},
	);

// ─── Secrets ─────────────────────────────────────────────────────────────────

export const saveSetupSecrets = createServerFn({ method: "POST" })
	.inputValidator((d: { secrets: Record<string, string> }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { secrets } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		for (const [key, value] of Object.entries(secrets)) {
			if (value.trim()) {
				envConfig[key] = value;
			}
		}

		await saveEnvConfig(envConfig, projectRoot);

		await logActivity(
			"setup_secrets",
			"system",
			null,
			`Saved ${Object.keys(secrets).length} secrets during setup`,
			"/setup",
		);
	});

export const generateSecret = createServerFn({ method: "POST" })
	.inputValidator((d: { command: string }) => d)
	.handler(async ({ data }): Promise<string> => {
		await ensureSession();
		const result = await shell("bash", ["-c", data.command], {
			ignoreError: true,
			timeout: 10000,
		});
		return result.stdout.trim();
	});

// ─── App installation ────────────────────────────────────────────────────────

export const installSetupApp = createServerFn({ method: "POST" })
	.inputValidator((d: { appName: string }) => d)
	.handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
		await ensureSession();
		const { appName } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		const app = APP_REGISTRY.find((a) => a.name === appName);
		if (!app) return { success: false, error: `App not found: ${appName}` };

		try {
			// Pull image
			await pullImage(app.image);

			// Write compose and start (inline from writeComposeAndStart)
			await writeComposeAndStart(app, envConfig);

			await logActivity(
				"setup_installed",
				"app",
				appName,
				`Installed ${app.displayName} during setup`,
				"/setup",
			);

			return { success: true };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return { success: false, error: message };
		}
	});

/**
 * Inlined from cli/src/commands/setup.tsx writeComposeAndStart.
 * Creates dirs, generates compose, and starts the container.
 */
async function writeComposeAndStart(
	app: AppDefinition,
	envConfig: Record<string, string | undefined>,
): Promise<void> {
	const baseDir = envConfig.BASE_DIR!;
	const appDir = getAppDir(app, baseDir);
	const composePath = getComposePath(app, baseDir);

	// Create app directory
	await shell("mkdir", ["-p", appDir], { sudo: true });

	// Create config directories
	const configPaths = getConfigPaths(app, baseDir);
	for (const p of configPaths) {
		await shell("mkdir", ["-p", p], { sudo: true });
	}

	// Create extra volume directories
	if (app.extraVolumes) {
		for (const vol of app.extraVolumes) {
			if (!vol.host.startsWith("/")) {
				await shell("mkdir", ["-p", `${appDir}/${vol.host}`], { sudo: true });
			}
		}
	}

	// Create data directory sub-mount directories
	if ((app as any).dataDirMounts) {
		const dataDir = `${baseDir}/data`;
		for (const mount of (app as any).dataDirMounts) {
			await shell("mkdir", ["-p", `${dataDir}/${mount.subpath}`], {
				sudo: true,
			});
		}
	}

	// Create seed files
	if (app.seedFiles) {
		for (const sf of app.seedFiles) {
			const filePath = `${appDir}/${sf.path}`;
			await shell(
				"bash",
				[
					"-c",
					`mkdir -p "$(dirname "${filePath}")" && [ -f "${filePath}" ] || cat > "${filePath}" << 'SEED_EOF'\n${sf.content}SEED_EOF`,
				],
				{ sudo: true },
			);
		}
	}

	// Generate and write docker-compose.yml
	const compose = generateCompose(app, envConfig as any);
	await shell(
		"bash",
		["-c", `cat > "${composePath}" << 'COMPOSE_EOF'\n${compose}COMPOSE_EOF`],
		{ sudo: true },
	);

	// Set ownership for config dirs
	const puid = envConfig.PUID ?? "1000";
	const pgid = envConfig.PGID ?? "1000";
	for (const p of configPaths) {
		await shell("chown", ["-R", `${puid}:${pgid}`, p], {
			sudo: true,
			ignoreError: true,
		});
	}

	// Clean up existing containers
	await composeDown(composePath).catch(() => {});
	for (const name of getAllContainerNames(app)) {
		await removeContainer(name);
	}

	// Start container
	await composeUp(composePath);
}

// ─── HTTPS setup ─────────────────────────────────────────────────────────────

export const setupHttps = createServerFn({ method: "POST" })
	.inputValidator((d: { acmeEmail: string }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { acmeEmail } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		envConfig.ACME_EMAIL = acmeEmail;
		envConfig.ENABLE_HTTPS = "true";

		const baseDir = envConfig.BASE_DIR!;
		const caddyApp = getApp("caddy");
		if (!caddyApp) throw new Error("Caddy app not found in registry");

		const caddyDir = getAppDir(caddyApp, baseDir);
		await shell("mkdir", ["-p", caddyDir], { sudo: true });

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
				"caddy-duckdns",
				"-f",
				`${caddyDir}/Dockerfile`,
				caddyDir,
			],
			{ sudo: true, timeout: 300000 },
		);

		// Detect installed apps for Caddyfile generation
		const installedApps = APP_REGISTRY.filter((app) =>
			existsSync(getComposePath(app, baseDir)),
		);

		// Generate Caddyfile and 404 page
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
			["-c", `cat > "${caddyDir}/404.html" << 'HTML_EOF'\n${page404}HTML_EOF`],
			{ sudo: true },
		);

		// Start Caddy
		await writeComposeAndStart(caddyApp, envConfig);

		// If Pi-hole is installed, regenerate its compose (port filtering)
		const piholeApp = getApp("pihole");
		if (piholeApp) {
			const piholeCompose = getComposePath(piholeApp, baseDir);
			if (existsSync(piholeCompose)) {
				const compose = generateCompose(piholeApp, envConfig as any);
				await shell(
					"bash",
					[
						"-c",
						`cat > "${piholeCompose}" << 'COMPOSE_EOF'\n${compose}COMPOSE_EOF`,
					],
					{ sudo: true },
				);

				// Add wildcard DNS for Pi-hole
				const domain = getDuckDnsDomain(envConfig);
				const localIp = await getLocalIp().catch(() => "localhost");
				if (domain) {
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
				}

				await composeDown(piholeCompose).catch(() => {});
				await composeUp(piholeCompose);
			}
		}

		await saveEnvConfig(envConfig, projectRoot);

		await logActivity(
			"setup_https",
			"system",
			null,
			"Enabled HTTPS with Caddy during setup",
			"/setup",
		);
	});

// ─── Auto-setup apps ─────────────────────────────────────────────────────────

export const autoSetupApp = createServerFn({ method: "POST" })
	.inputValidator(
		(d: {
			appName: string;
			credentials: { username: string; password: string };
			selectedApps: string[];
			settings?: Record<string, string>;
		}) => d,
	)
	.handler(
		async ({
			data,
		}): Promise<{ success: boolean; warnings: string[]; error?: string }> => {
			await ensureSession();
			const { appName, credentials, selectedApps, settings } = data;
			const { username, password } = credentials;
			const projectRoot = getProjectRoot();
			const envConfig = await loadEnvConfig(projectRoot);
			const baseDir = envConfig.BASE_DIR!;
			const localIp = await getLocalIp().catch(() => "localhost");
			const warnings: string[] = [];

			const hasApp = (name: string) => selectedApps.includes(name);
			const app = APP_REGISTRY.find((a) => a.name === appName);
			if (!app)
				return { success: false, warnings, error: `App not found: ${appName}` };

			const baseUrl = `http://${localIp}:${app.port}`;

			try {
				// ── qBittorrent
				if (appName === "qbittorrent") {
					const creds = await getQBittorrentCredentials(baseDir);
					if (!creds)
						throw new Error("No temporary password found in container logs");
					const client = createQBittorrentClient({ baseUrl });
					const login = await client.auth.login(creds.username, creds.password);
					if (!login.success)
						throw new Error("Login failed (IP may be banned)");
					await client.app.setPreferences({
						save_path: "/data/downloads",
						auto_tmm_enabled: true,
						web_ui_username: username,
						web_ui_password: password,
					});
				}

				// ── Prowlarr
				if (appName === "prowlarr") {
					const apiKey = await getProwlarrApiKey(baseDir);
					if (!apiKey)
						throw new Error("Could not read API key from config.xml");
					const client = createProwlarrClient({ apiKey, baseUrl });
					const hostConfig = await client.hostConfig.get();
					await client.hostConfig.update(hostConfig.id!, {
						...hostConfig,
						authenticationMethod: "forms",
						username,
						password,
						passwordConfirmation: password,
					});
					// Register *arr apps
					const arrApps: Array<{
						name: string;
						impl: string;
						contract: string;
						port: number;
						getKey: () => Promise<string | null>;
					}> = [];
					if (hasApp("radarr"))
						arrApps.push({
							name: "Radarr",
							impl: "Radarr",
							contract: "RadarrSettings",
							port: 7878,
							getKey: () => getRadarrApiKey(baseDir),
						});
					if (hasApp("sonarr"))
						arrApps.push({
							name: "Sonarr",
							impl: "Sonarr",
							contract: "SonarrSettings",
							port: 8989,
							getKey: () => getSonarrApiKey(baseDir),
						});
					if (hasApp("lidarr"))
						arrApps.push({
							name: "Lidarr",
							impl: "Lidarr",
							contract: "LidarrSettings",
							port: 8686,
							getKey: () => getLidarrApiKey(baseDir),
						});
					for (const arr of arrApps) {
						try {
							const arrApiKey = await arr.getKey();
							if (!arrApiKey) {
								warnings.push(`Register ${arr.name}: could not read API key`);
								continue;
							}
							await client.application.create({
								name: arr.name,
								implementation: arr.impl,
								configContract: arr.contract,
								syncLevel: "fullSync",
								fields: [
									{
										order: 0,
										name: "prowlarrUrl",
										label: "Prowlarr URL",
										value: `http://${localIp}:9696`,
									},
									{
										order: 1,
										name: "baseUrl",
										label: "Base URL",
										value: `http://${localIp}:${arr.port}`,
									},
									{
										order: 2,
										name: "apiKey",
										label: "API Key",
										value: arrApiKey,
									},
								],
							});
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
					}
				}

				// ── Radarr
				if (appName === "radarr") {
					const apiKey = await getRadarrApiKey(baseDir);
					if (!apiKey)
						throw new Error("Could not read API key from config.xml");
					const client = createRadarrClient({ apiKey, baseUrl });
					const hostConfig = await client.hostConfig.get();
					await client.hostConfig.update(hostConfig.id!, {
						...hostConfig,
						authenticationMethod: "forms",
						username,
						password,
						passwordConfirmation: password,
					});
					if (hasApp("qbittorrent")) {
						try {
							await client.downloadClient.create({
								name: "qBittorrent",
								implementation: "QBittorrent",
								configContract: "QBittorrentSettings",
								protocol: "torrent",
								enable: true,
								priority: 1,
								removeCompletedDownloads: true,
								removeFailedDownloads: true,
								fields: [
									{ order: 0, name: "host", label: "Host", value: localIp },
									{ order: 1, name: "port", label: "Port", value: 8080 },
									{
										order: 2,
										name: "username",
										label: "Username",
										value: username,
									},
									{
										order: 3,
										name: "password",
										label: "Password",
										value: password,
									},
								],
							});
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
					}
					try {
						await client.rootFolder.create({ path: "/data/media/movies" });
					} catch (err: unknown) {
						warnings.push(err instanceof Error ? err.message : String(err));
					}
				}

				// ── Sonarr
				if (appName === "sonarr") {
					const apiKey = await getSonarrApiKey(baseDir);
					if (!apiKey)
						throw new Error("Could not read API key from config.xml");
					const client = createSonarrClient({ apiKey, baseUrl });
					const hostConfig = await client.hostConfig.get();
					await client.hostConfig.update(hostConfig.id!, {
						...hostConfig,
						authenticationMethod: "forms",
						username,
						password,
						passwordConfirmation: password,
					});
					if (hasApp("qbittorrent")) {
						try {
							await client.downloadClient.create({
								name: "qBittorrent",
								implementation: "QBittorrent",
								configContract: "QBittorrentSettings",
								protocol: "torrent",
								enable: true,
								priority: 1,
								removeCompletedDownloads: true,
								removeFailedDownloads: true,
								fields: [
									{ order: 0, name: "host", label: "Host", value: localIp },
									{ order: 1, name: "port", label: "Port", value: 8080 },
									{
										order: 2,
										name: "username",
										label: "Username",
										value: username,
									},
									{
										order: 3,
										name: "password",
										label: "Password",
										value: password,
									},
								],
							});
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
					}
					try {
						await client.rootFolder.create({ path: "/data/media/tv" });
					} catch (err: unknown) {
						warnings.push(err instanceof Error ? err.message : String(err));
					}
				}

				// ── Lidarr
				if (appName === "lidarr") {
					const apiKey = await getLidarrApiKey(baseDir);
					if (!apiKey)
						throw new Error("Could not read API key from config.xml");
					const client = createLidarrClient({ apiKey, baseUrl });
					const hostConfig = await client.hostConfig.get();
					await client.hostConfig.update(hostConfig.id!, {
						...hostConfig,
						authenticationMethod: "forms",
						username,
						password,
						passwordConfirmation: password,
					});
					if (hasApp("qbittorrent")) {
						try {
							await client.downloadClient.create({
								name: "qBittorrent",
								implementation: "QBittorrent",
								configContract: "QBittorrentSettings",
								protocol: "torrent",
								enable: true,
								priority: 1,
								removeCompletedDownloads: true,
								removeFailedDownloads: true,
								fields: [
									{ order: 0, name: "host", label: "Host", value: localIp },
									{ order: 1, name: "port", label: "Port", value: 8080 },
									{
										order: 2,
										name: "username",
										label: "Username",
										value: username,
									},
									{
										order: 3,
										name: "password",
										label: "Password",
										value: password,
									},
								],
							});
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
					}
					try {
						await client.rootFolder.create({
							path: "/data/media/music",
							name: "Music",
							defaultMetadataProfileId: 1,
							defaultQualityProfileId: 1,
						});
					} catch (err: unknown) {
						warnings.push(err instanceof Error ? err.message : String(err));
					}
				}

				// ── Jellyfin
				if (appName === "jellyfin") {
					const client = createJellyfinClient({ baseUrl });
					const info = await client.system.getPublicInfo();
					if (!info.StartupWizardCompleted) {
						const serverName = settings?.serverName ?? "Mithrandir";
						const language = settings?.language ?? "en";
						const country = settings?.country ?? "US";
						await client.startup.updateConfiguration({
							ServerName: serverName,
							UICulture: language,
							MetadataCountryCode: country,
							PreferredMetadataLanguage: language,
						});
						await client.startup.getFirstUser();
						await client.startup.updateUser({
							Name: username,
							Password: password,
						});
						await client.startup.setRemoteAccess({
							EnableRemoteAccess: true,
							EnableAutomaticPortMapping: false,
						});
						await client.startup.complete();
					}

					const jellyfinApiKey = await getJellyfinApiKey(
						baseUrl,
						username,
						password,
					);
					if (jellyfinApiKey) {
						const authClient = createJellyfinClient({
							baseUrl,
							apiKey: jellyfinApiKey,
						});
						try {
							await authClient.library.addVirtualFolder({
								name: "Movies",
								collectionType: "movies",
								paths: ["/data/media/movies"],
								refreshLibrary: false,
							});
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
						try {
							await authClient.library.addVirtualFolder({
								name: "Series",
								collectionType: "tvshows",
								paths: ["/data/media/tv"],
								refreshLibrary: false,
							});
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
					}
				}

				// ── Seerr
				if (appName === "seerr") {
					const apiKey = await getSeerrApiKey(baseDir);
					if (!apiKey)
						throw new Error("Could not read API key from settings.json");
					const client = createSeerrClient({ apiKey, baseUrl });
					const jellyfinUrl = `http://${localIp}:8096`;

					if (hasApp("jellyfin")) {
						await client.auth.loginJellyfin({
							username,
							password,
							hostname: localIp,
							port: 8096,
							useSsl: false,
							urlBase: "",
							serverType: 1,
						});

						await client.jellyfinSettings.update({
							hostname: jellyfinUrl,
							adminUser: username,
							adminPass: password,
						});

						try {
							const libs = await client.jellyfinSettings.getLibraries({
								sync: true,
							});
							const movieLib = libs.find((l) =>
								l.name.toLowerCase().includes("movie"),
							);
							const tvLib = libs.find(
								(l) =>
									l.name.toLowerCase().includes("tv") ||
									l.name.toLowerCase().includes("show") ||
									l.name.toLowerCase().includes("series"),
							);
							const enableIds = [movieLib?.id, tvLib?.id]
								.filter(Boolean)
								.join(",");
							if (enableIds) {
								await client.jellyfinSettings.getLibraries({
									enable: enableIds,
								});
							}
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}

						try {
							const jellyfinUsers =
								await client.jellyfinSettings.getJellyfinUsers();
							const adminUser = jellyfinUsers.find(
								(u) => u.username === username,
							);
							if (adminUser) {
								await client.users.importFromJellyfin([adminUser.id]);
							}
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
					}

					if (hasApp("radarr")) {
						try {
							const radarrApiKey = await getRadarrApiKey(baseDir);
							if (radarrApiKey) {
								await client.radarr.create({
									name: "Radarr",
									hostname: localIp,
									port: 7878,
									apiKey: radarrApiKey,
									useSsl: false,
									activeProfileId: 1,
									activeProfileName: "Any",
									activeDirectory: "/data/media/movies",
									is4k: false,
									minimumAvailability: "released",
									isDefault: true,
								});
							} else {
								warnings.push("Connect Radarr: could not read API key");
							}
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
					}

					if (hasApp("sonarr")) {
						try {
							const sonarrApiKey = await getSonarrApiKey(baseDir);
							if (sonarrApiKey) {
								await client.sonarr.create({
									name: "Sonarr",
									hostname: localIp,
									port: 8989,
									apiKey: sonarrApiKey,
									useSsl: false,
									activeProfileId: 1,
									activeProfileName: "Any",
									activeDirectory: "/data/media/tv",
									is4k: false,
									enableSeasonFolders: true,
									isDefault: true,
								});
							} else {
								warnings.push("Connect Sonarr: could not read API key");
							}
						} catch (err: unknown) {
							warnings.push(err instanceof Error ? err.message : String(err));
						}
					}
				}

				// ── Gatus
				if (appName === "gatus") {
					const discordWebhook = settings?.discordWebhook || "";

					// Hash password with bcrypt
					const bcryptHash = await Bun.password.hash(password, {
						algorithm: "bcrypt",
						cost: 9,
					});
					const b64Hash = btoa(bcryptHash);

					// Get installed apps for endpoint generation
					const installedApps = selectedApps
						.map((name) => APP_REGISTRY.find((a) => a.name === name))
						.filter((a): a is AppDefinition => a !== undefined);

					const configYaml = generateGatusConfig(installedApps, localIp, {
						username,
						passwordBcryptBase64: b64Hash,
						discordWebhook: discordWebhook || undefined,
						envConfig,
					});

					const gatusConfigDir = `${baseDir}/gatus/config`;
					await shell("mkdir", ["-p", gatusConfigDir], { sudo: true });
					await shell(
						"bash",
						[
							"-c",
							`cat > "${gatusConfigDir}/config.yaml" << 'GATUS_EOF'\n${configYaml}GATUS_EOF`,
						],
						{ sudo: true },
					);

					// Regenerate compose with extra_hosts if HTTPS is enabled
					const gatusApp = getApp("gatus");
					if (gatusApp && envConfig.ENABLE_HTTPS === "true") {
						const extraHosts = generateGatusExtraHosts(
							installedApps,
							localIp,
							envConfig,
						);
						if (extraHosts.length > 0) {
							const composePath = getComposePath(gatusApp, baseDir);
							let compose = generateCompose(gatusApp, envConfig as any);
							const extraHostsBlock =
								"    extra_hosts:\n" +
								extraHosts.map((h) => `      - ${h}`).join("\n") +
								"\n";
							compose = compose.replace(
								/ {4}restart:/,
								extraHostsBlock + "    restart:",
							);
							await shell(
								"bash",
								[
									"-c",
									`cat > "${composePath}" << 'COMPOSE_EOF'\n${compose}COMPOSE_EOF`,
								],
								{ sudo: true },
							);
						}
					}

					// Restart gatus
					if (gatusApp) {
						const composePath = getComposePath(gatusApp, baseDir);
						await composeDown(composePath).catch(() => {});
						await composeUp(composePath);
					}
				}

				await logActivity(
					"setup_autosetup",
					"app",
					appName,
					`Auto-configured ${app.displayName} during setup`,
					"/setup",
				);

				return { success: true, warnings };
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				return { success: false, warnings, error: message };
			}
		},
	);

// ─── Firewall ────────────────────────────────────────────────────────────────

export const setupFirewall = createServerFn({ method: "POST" })
	.inputValidator((d: { appNames: string[] }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { appNames } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		// Install UFW if needed
		const ufwInstalled = await isUfwInstalled().catch(() => false);
		if (!ufwInstalled) {
			await installUfw();
		}

		// Install ufw-docker
		await installUfwDocker();

		// Enable UFW
		const ufwActive = await isUfwActive().catch(() => false);
		if (!ufwActive) {
			await enableUfw();
		}

		// Sync app ports
		const apps = appNames
			.map((name) => APP_REGISTRY.find((a) => a.name === name))
			.filter((a): a is AppDefinition => a !== undefined);
		await syncAllAppPorts(apps);

		// Save to .env
		envConfig.ENABLE_FIREWALL = "true";
		await saveEnvConfig(envConfig, projectRoot);

		await logActivity(
			"setup_firewall",
			"system",
			null,
			"Enabled firewall during setup",
			"/setup",
		);
	});

// ─── Backup timer ────────────────────────────────────────────────────────────

export const setupBackupTimer = createServerFn({ method: "POST" })
	.inputValidator((d: { hour: number }) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { hour } = data;
		const projectRoot = getProjectRoot();
		const envConfig = await loadEnvConfig(projectRoot);

		const hasSystemdResult = await hasSystemd().catch(() => false);
		if (hasSystemdResult) {
			await installSystemdUnits(hour);
		}

		envConfig.BACKUP_HOUR = String(hour);
		await saveEnvConfig(envConfig, projectRoot);

		await logActivity(
			"setup_backup",
			"system",
			null,
			`Set backup timer to ${hour}:00 during setup`,
			"/setup",
		);

		return { installed: hasSystemdResult };
	});

// ─── Complete setup ──────────────────────────────────────────────────────────

async function upsertSetupStatus(status: SetupStatus) {
	const existing = await db
		.select()
		.from(systemSettings)
		.where(eq(systemSettings.key, "setup_status"))
		.get();

	if (existing) {
		await db
			.update(systemSettings)
			.set({ value: status, updatedAt: new Date() })
			.where(eq(systemSettings.key, "setup_status"));
	} else {
		await db.insert(systemSettings).values({
			key: "setup_status",
			value: status,
			updatedAt: new Date(),
		});
	}
}

export const completeSetup = createServerFn({ method: "POST" }).handler(
	async () => {
		await ensureSession();
		await upsertSetupStatus("completed");
		await logActivity(
			"setup_completed",
			"system",
			null,
			"Completed initial setup",
			"/setup",
		);
	},
);

export const skipSetup = createServerFn({ method: "POST" }).handler(
	async () => {
		await ensureSession();
		await upsertSetupStatus("skipped");
		await logActivity(
			"setup_skipped",
			"system",
			null,
			"Skipped initial setup",
			"/setup",
		);
	},
);

export const resumeSetup = createServerFn({ method: "POST" }).handler(
	async () => {
		await ensureSession();
		await upsertSetupStatus("started");
		await logActivity(
			"setup_resumed",
			"system",
			null,
			"Resumed setup",
			"/setup",
		);
	},
);

// ─── Service URLs ────────────────────────────────────────────────────────────

export const fetchServiceUrls = createServerFn({ method: "POST" })
	.inputValidator(
		(d: {
			appNames: string[];
			httpsEnabled: boolean;
			duckdnsSubdomains?: string;
		}) => d,
	)
	.handler(async ({ data }) => {
		await ensureSession();
		const { appNames, httpsEnabled, duckdnsSubdomains } = data;
		const localIp = await getLocalIp().catch(() => "localhost");
		const domain = duckdnsSubdomains
			? `${duckdnsSubdomains}.duckdns.org`
			: null;

		return appNames
			.map((name) => {
				const app = APP_REGISTRY.find((a) => a.name === name);
				if (!app || !app.port) return null;
				const url =
					httpsEnabled && domain
						? `https://${app.name}.${domain}`
						: `http://${localIp}:${app.port}`;
				return {
					name: app.name,
					displayName: app.displayName,
					url,
					port: app.port,
				};
			})
			.filter((u): u is NonNullable<typeof u> => u !== null);
	});
