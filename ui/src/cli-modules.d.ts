// Type declarations for @mithrandir/cli cross-workspace imports.
// The CLI uses `@/` path aliases that UI's tsconfig can't resolve transitively,
// so we declare the module types explicitly here.

declare module "@mithrandir/cli/lib/apps" {
	export interface AppDefinition {
		name: string;
		displayName: string;
		description: string;
		image: string;
		containerName?: string;
		port: number | null;
		containerPort?: number;
		configSubdir: string;
		multipleConfigDirs?: string[];
		networkMode?: "host";
		capAdd?: string[];
		sysctls?: Record<string, string>;
		needsDataDir: boolean;
		dataDirReadOnly?: boolean;
		extraVolumes?: Array<{
			host: string;
			container: string;
			options?: string;
		}>;
		mountDockerSocket?: boolean;
		secrets?: Array<{
			envVar: string;
			prompt: string;
			sensitive?: boolean;
			required?: boolean;
			generate?: string;
		}>;
		environment?: Record<string, string>;
		init?: boolean;
		user?: string;
		healthcheck?: {
			test: string;
			startPeriod?: string;
			timeout?: string;
			interval?: string;
			retries?: number;
		};
		extraPorts?: Array<{
			host: number;
			container: number;
			protocol?: "tcp" | "udp";
		}>;
		command?: string[];
		restartPolicy?: string;
		mountMusicDir?: boolean;
		conflictsWith?: string[];
		requiresHttps?: boolean;
		hidden?: boolean;
		companionOf?: string;
		additionalContainers?: string[];
		caddyExtraSubdomains?: Array<{ subdomain: string; port: number }>;
		rawCompose?: (envConfig: Record<string, string>) => string;
		seedFiles?: Array<{ path: string; content: string }>;
		capacity?: {
			performance: "low" | "medium" | "high";
			storage: "low" | "medium" | "high";
			note?: string;
		};
	}

	export interface AppCategory {
		label: string;
		value: string;
		description: string;
		apps: string[];
	}

	export const APP_REGISTRY: AppDefinition[];
	export const APP_CATEGORIES: AppCategory[];
	export function getComposePath(
		app: AppDefinition,
		baseDir: string,
	): string;
	export function getContainerName(app: AppDefinition): string;
	export function getAppDir(app: AppDefinition, baseDir: string): string;
	export function getApp(name: string): AppDefinition | undefined;
}

declare module "@mithrandir/cli/lib/config" {
	export interface EnvConfig {
		BASE_DIR: string;
		PUID?: string;
		PGID?: string;
		TZ?: string;
		BACKUP_DIR?: string;
		LOCAL_RETENTION?: string;
		REMOTE_RETENTION?: string;
		RCLONE_REMOTE?: string;
		RCLONE_REMOTES?: string;
		APPS?: string;
		ENABLE_HTTPS?: string;
		ENABLE_FIREWALL?: string;
		ACME_EMAIL?: string;
		DUCKDNS_SUBDOMAINS?: string;
		BACKUP_PASSWORD?: string;
		BACKUP_HOUR?: string;
		[key: string]: string | undefined;
	}

	export interface BackupConfig {
		BACKUP_DIR: string;
		LOCAL_RETENTION: number;
		REMOTE_RETENTION: number;
		RCLONE_REMOTES: string[];
		APPS: string;
		BASE_DIR: string;
		BACKUP_PASSWORD?: string;
		BACKUP_HOUR: number;
	}

	export function loadEnvConfig(projectRoot?: string): Promise<EnvConfig>;
	export function getBackupConfig(env: EnvConfig): BackupConfig;
	export function saveEnvConfig(
		config: EnvConfig,
		projectRoot?: string,
	): Promise<void>;
	export function getProjectRoot(): string;
}

declare module "@mithrandir/cli/lib/docker" {
	export function isContainerRunning(containerName: string): Promise<boolean>;
	export function composeUp(composePath: string): Promise<void>;
	export function composeDown(composePath: string): Promise<void>;
	export function isDockerInstalled(): Promise<boolean>;
}

declare module "@mithrandir/cli/lib/shell" {
	interface ShellOptions {
		sudo?: boolean;
		ignoreError?: boolean;
		timeout?: number;
		cwd?: string;
	}

	interface ShellResult {
		stdout: string;
		stderr?: string;
		exitCode: number;
	}

	export function shell(
		cmd: string,
		args: string[],
		options?: ShellOptions,
	): Promise<ShellResult>;
	export function dockerNeedsSudo(): Promise<boolean>;
	export function commandExists(cmd: string): Promise<boolean>;
}

declare module "@mithrandir/cli/lib/status" {
	import type { AppDefinition } from "@mithrandir/cli/lib/apps";

	export interface AppInfo {
		app: AppDefinition;
		containerStatus: string;
		url: string | null;
		lastBackup: string | null;
		diskUsage: string;
	}

	export interface SystemInfo {
		dockerRunning: boolean;
		timerActive: boolean | null;
		timerNext: string | null;
		docsRunning: boolean;
		docsUrl: string | null;
		apps: AppInfo[];
	}

	export function gatherSystemInfo(
		projectRoot?: string,
	): Promise<SystemInfo>;
	export function detectInstalledApps(
		baseDir: string,
	): AppDefinition[];
	export function getContainerStatus(
		app: AppDefinition,
	): Promise<string>;
}

declare module "@mithrandir/cli/lib/health" {
	export type CheckStatus = "pass" | "warn" | "fail";

	export interface CheckResult {
		name: string;
		status: CheckStatus;
		message: string;
	}

	export function runHealthChecks(
		projectRoot?: string,
	): Promise<CheckResult[]>;
}

declare module "@mithrandir/cli/lib/caddy" {
	export function getDuckDnsDomain(
		envConfig: Record<string, string | undefined>,
	): string | null;
}

declare module "@mithrandir/cli/lib/backup-utils" {
	export function isBackupArchive(filename: string): boolean;
	export function findArchiveFile(
		dir: string,
		appName: string,
	): string | null;
	export const ENCRYPTED_EXT: string;
	export const ARCHIVE_EXT: string;
}
