import type { EnvConfig } from "./config";

export const TAILSCALE_ADMIN_URL: string;
export const TAILSCALE_KEYS_URL: string;
export const TAILSCALE_DOWNLOAD_URL: string;
export const TAILSCALE_INTERFACE: string;
export const TAILSCALE_UDP_PORT: number;
export const TAILSCALE_SYSCTL_PATH: string;
export const DEFAULT_TAILSCALE_HOSTNAME: string;

export interface TailscaleSettings {
	hostname: string;
	advertiseRoutes: string[];
	exitNode: boolean;
	ssh: boolean;
}

export type TailscaleBackendState =
	| "NoState"
	| "NeedsLogin"
	| "NeedsMachineAuth"
	| "Stopped"
	| "Starting"
	| "Running"
	| "Unknown";

export interface TailscaleStatus {
	installed: boolean;
	daemonRunning: boolean;
	backendState: TailscaleBackendState;
	connected: boolean;
	version?: string;
	authUrl?: string;
	ipv4?: string;
	ipv6?: string;
	dnsName?: string;
	hostname?: string;
	tailnet?: string;
	magicDnsSuffix?: string;
	approvedRoutes: string[];
	exitNodeApproved: boolean;
	keyExpiry?: string;
}

export interface ConnectOptions {
	authKey?: string;
	onAuthUrl?: (url: string, qr: string | null) => void;
	qr?: boolean;
	timeoutMs?: number;
}

export function parseRoutesSetting(
	value: string | undefined,
): "auto" | string[];
export function isValidCidr(cidr: string): boolean;
export function sanitizeHostname(name: string | undefined): string;
export function resolveTailscaleSettings(
	env: EnvConfig,
): Promise<TailscaleSettings>;
export function applyTailscaleSettingsToEnv(
	env: EnvConfig,
	settings: TailscaleSettings,
	detectedLan?: string | null,
): EnvConfig;
export function detectLanSubnet(): Promise<string | null>;
export function getPendingRoutes(
	status: TailscaleStatus,
	wanted: string[],
): string[];
export function daysUntilKeyExpiry(
	status: TailscaleStatus,
	now?: Date,
): number | null;
export function isTailscaleInstalled(): Promise<boolean>;
export function getTailscaleStatus(): Promise<TailscaleStatus>;
export function installTailscale(): Promise<void>;
export function ensureTailscaleDaemon(): Promise<void>;
export function enableIpForwarding(): Promise<void>;
export function connectTailscale(
	settings: TailscaleSettings,
	opts?: ConnectOptions,
): Promise<TailscaleStatus>;
export function applyTailscaleSettings(
	settings: TailscaleSettings,
): Promise<void>;
export function logoutTailscale(): Promise<void>;
export function uninstallTailscale(): Promise<boolean>;
export function getTailnetAppUrl(
	status: TailscaleStatus,
	port: number,
): string | null;
