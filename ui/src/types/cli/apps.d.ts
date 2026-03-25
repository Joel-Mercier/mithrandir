export interface AppDefinition {
	name: string;
	displayName: string;
	description: string;
	image: string;
	icon?: string;
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
export function getComposePath(app: AppDefinition, baseDir: string): string;
export function getContainerName(app: AppDefinition): string;
export function getAppDir(app: AppDefinition, baseDir: string): string;
export function getApp(name: string): AppDefinition | undefined;
export function getConfigPaths(app: AppDefinition, baseDir: string): string[];
export function getAllContainerNames(app: AppDefinition): string[];
export function filterConflicts(apps: AppDefinition[]): AppDefinition[];
export function getCompanionApps(appName: string): AppDefinition[];

export interface AppDependency {
	[appName: string]: string[];
}

export const APP_DEPENDENCIES: AppDependency;

export interface AppStack {
	name: string;
	displayName: string;
	apps: string[];
}

export const APP_STACKS: AppStack[];

export function dataDirMounts(app: AppDefinition): string[];
