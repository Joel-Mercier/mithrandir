import { loadEnvConfig, saveEnvConfig } from "@mithrandir/cli/lib/config";
import {
	applyTailscaleSettings,
	applyTailscaleSettingsToEnv,
	connectTailscale,
	daysUntilKeyExpiry,
	detectLanSubnet,
	enableIpForwarding,
	ensureTailscaleDaemon,
	getPendingRoutes,
	getTailscaleStatus,
	installTailscale,
	isValidCidr,
	logoutTailscale,
	resolveTailscaleSettings,
	sanitizeHostname,
	type TailscaleSettings,
	type TailscaleStatus,
} from "@mithrandir/cli/lib/tailscale";
import {
	allowTailscaleTraffic,
	isUfwActive,
	removeTailscaleTraffic,
} from "@mithrandir/cli/lib/ufw";
import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/lib/auth";
import { logActivity } from "./activity";
import { getProjectRoot } from "./utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TailscaleSettingsInput {
	hostname: string;
	/** Share the LAN subnet (subnet router) */
	shareLan: boolean;
	/** Custom subnets; when empty and shareLan is true, the detected LAN is used */
	routes?: string[];
	exitNode: boolean;
	ssh: boolean;
}

export interface TailscaleLoginInput extends TailscaleSettingsInput {
	/** Optional tskey-auth-… key for non-interactive login */
	authKey?: string;
	/** Activity route to log against ("/setup" or "/settings") */
	route?: string;
}

export interface TailscaleOverview {
	enabled: boolean;
	status: TailscaleStatus;
	settings: TailscaleSettings;
	detectedLan: string | null;
	pendingRoutes: string[];
	exitNodePending: boolean;
	keyExpiryDays: number | null;
	login: {
		inProgress: boolean;
		authUrl: string | null;
		error: string | null;
	};
}

// ─── Background login state ──────────────────────────────────────────────────
// `tailscale up` blocks until the user signs in, so it runs in the background
// and the client polls `fetchTailscale` for the login URL and connection state.

const login: {
	inProgress: boolean;
	authUrl: string | null;
	error: string | null;
} = { inProgress: false, authUrl: null, error: null };

async function toSettings(
	input: TailscaleSettingsInput,
): Promise<{ settings: TailscaleSettings; detectedLan: string | null }> {
	const detectedLan = await detectLanSubnet();
	let advertiseRoutes: string[] = [];
	if (input.shareLan) {
		const custom = (input.routes ?? []).map((r) => r.trim()).filter(Boolean);
		const invalid = custom.filter((r) => !isValidCidr(r));
		if (invalid.length > 0) {
			throw new Error(`Invalid subnet: ${invalid.join(", ")}`);
		}
		advertiseRoutes =
			custom.length > 0 ? custom : detectedLan ? [detectedLan] : [];
	}
	return {
		detectedLan,
		settings: {
			hostname: sanitizeHostname(input.hostname),
			advertiseRoutes,
			exitNode: input.exitNode,
			ssh: input.ssh,
		},
	};
}

async function persistSettings(
	settings: TailscaleSettings,
	detectedLan: string | null,
): Promise<void> {
	const projectRoot = getProjectRoot();
	const env = await loadEnvConfig(projectRoot);
	applyTailscaleSettingsToEnv(env, settings, detectedLan);
	await saveEnvConfig(env, projectRoot);
	if (
		env.ENABLE_FIREWALL === "true" &&
		(await isUfwActive().catch(() => false))
	) {
		await allowTailscaleTraffic();
	}
}

// ─── Server functions ────────────────────────────────────────────────────────

export const fetchTailscale = createServerFn({ method: "GET" }).handler(
	async (): Promise<TailscaleOverview> => {
		await ensureSession();
		const env = await loadEnvConfig(getProjectRoot());
		const [status, settings, detectedLan] = await Promise.all([
			getTailscaleStatus(),
			resolveTailscaleSettings(env),
			detectLanSubnet(),
		]);
		return {
			enabled: env.ENABLE_TAILSCALE === "true",
			status,
			settings,
			detectedLan,
			pendingRoutes: status.connected
				? getPendingRoutes(status, settings.advertiseRoutes)
				: [],
			exitNodePending:
				status.connected && settings.exitNode && !status.exitNodeApproved,
			keyExpiryDays: daysUntilKeyExpiry(status),
			login: {
				inProgress: login.inProgress,
				authUrl:
					login.authUrl ??
					(status.backendState === "NeedsLogin"
						? (status.authUrl ?? null)
						: null),
				error: login.error,
			},
		};
	},
);

/**
 * Install Tailscale (if needed) and start `tailscale up` in the background.
 * Resolves once a login URL is available, the node is connected, or ~20s elapsed.
 */
export const startTailscaleLogin = createServerFn({ method: "POST" })
	.inputValidator((d: TailscaleLoginInput) => d)
	.handler(
		async ({
			data,
		}): Promise<{
			connected: boolean;
			authUrl: string | null;
			error: string | null;
		}> => {
			await ensureSession();
			if (login.inProgress) {
				return { connected: false, authUrl: login.authUrl, error: null };
			}

			const { settings, detectedLan } = await toSettings(data);

			const before = await getTailscaleStatus();
			if (!before.installed) {
				await installTailscale();
			} else {
				await ensureTailscaleDaemon();
			}
			if (settings.advertiseRoutes.length > 0 || settings.exitNode) {
				await enableIpForwarding();
			}

			login.inProgress = true;
			login.authUrl = null;
			login.error = null;

			const route = data.route ?? "/settings";
			const run = connectTailscale(settings, {
				authKey: data.authKey?.trim() || undefined,
				onAuthUrl: (url) => {
					login.authUrl = url;
				},
			})
				.then(async (status) => {
					if (!status.connected) {
						throw new Error(
							`Tailscale is not connected (state: ${status.backendState})`,
						);
					}
					await persistSettings(settings, detectedLan);
					await logActivity(
						"tailscale_connected",
						"system",
						status.dnsName ?? null,
						route,
					);
				})
				.catch((err: unknown) => {
					login.error = err instanceof Error ? err.message : String(err);
				})
				.finally(() => {
					login.inProgress = false;
					login.authUrl = null;
				});

			// Wait briefly for the sign-in URL or an immediate (auth key) connection
			const deadline = Date.now() + 20_000;
			let finished = false;
			run.then(() => {
				finished = true;
			});
			while (!finished && !login.authUrl && Date.now() < deadline) {
				await new Promise((r) => setTimeout(r, 500));
			}

			const status = await getTailscaleStatus();
			return {
				connected: status.connected,
				authUrl: login.authUrl,
				error: login.error,
			};
		},
	);

/** Change settings on an already-connected node */
export const updateTailscaleSettings = createServerFn({ method: "POST" })
	.inputValidator((d: TailscaleSettingsInput) => d)
	.handler(async ({ data }) => {
		await ensureSession();
		const { settings, detectedLan } = await toSettings(data);
		if (settings.advertiseRoutes.length > 0 || settings.exitNode) {
			await enableIpForwarding();
		}
		await applyTailscaleSettings(settings);
		await persistSettings(settings, detectedLan);
		await logActivity("tailscale_updated", "system", null, "/settings");
	});

/** Log out of the tailnet and disable Tailscale in .env (the package stays installed) */
export const disconnectTailscale = createServerFn({ method: "POST" }).handler(
	async () => {
		await ensureSession();
		await logoutTailscale();
		await removeTailscaleTraffic().catch(() => {});
		const projectRoot = getProjectRoot();
		const env = await loadEnvConfig(projectRoot);
		env.ENABLE_TAILSCALE = "false";
		await saveEnvConfig(env, projectRoot);
		login.authUrl = null;
		login.error = null;
		await logActivity("tailscale_disconnected", "system", null, "/settings");
	},
);
