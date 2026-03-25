// ─── UI-facing types ────────────────────────────────────────────

export type AppStatus = "running" | "stopped" | "error" | "available";
export type AppCategory =
	| "media"
	| "automation"
	| "monitoring"
	| "productivity"
	| "ai"
	| "finance"
	| "security"
	| "travel"
	| "statistics"
	| "household"
	| "utilities";

export type CapacityScore = "low" | "medium" | "high";

export interface DashboardApp {
	name: string;
	displayName: string;
	description: string;
	port: number;
	status: AppStatus;
	category: AppCategory;
	uptime: string;
	icon?: string;
	hidden?: boolean;
	website?: string;
	github?: string;
	performanceScore?: CapacityScore;
	storageScore?: CapacityScore;
	capacityNote?: string;
}

export interface AppDetail extends DashboardApp {
	image: string;
	configPath: string;
	volumes: string[];
	cpuUsage: number;
	ramUsageMB: number;
	networkRx: string;
	networkTx: string;
	restarts: number;
	createdAt: string;
	logs: string[];
}

export interface StorageMount {
	path: string;
	totalGB: number;
	usedGB: number;
}

export interface SystemResources {
	cpuModel: string;
	cores: number;
	cpuUsage: number;
	ramTotalGB: number;
	ramUsedGB: number;
	mounts: StorageMount[];
}

export interface BackupEntry {
	date: string;
	size: string;
	apps: number;
	encrypted: boolean;
	location: "local" | "remote";
	remote?: string;
	verified: boolean;
}

export interface BackupStatus {
	lastBackupDate: string;
	nextScheduledHour: number;
	localRetention: number;
	remoteRetention: number;
	remotes: string[];
	encrypted: boolean;
}

export interface SystemConfig {
	baseDir: string;
	timezone: string;
	httpsEnabled: boolean;
	firewallEnabled: boolean;
	acmeEmail: string;
	duckdnsDomain: string;
	backupDir: string;
	backupHour: number;
	backupPassword: boolean;
	localRetention: number;
	remoteRetention: number;
	remotes: string[];
	puid: number;
	pgid: number;
}

export interface HttpsPrerequisites {
	duckdnsConfigured: boolean;
	duckdnsInstalled: boolean;
	duckdnsRunning: boolean;
	domain: string | null;
	ready: boolean;
}

export interface FirewallPrerequisites {
	ufwInstalled: boolean;
	ufwDockerInstalled: boolean;
	ufwActive: boolean;
	ready: boolean;
}

export interface FirewallRule {
	port: number;
	protocol: string;
	app: string;
	type: "ufw" | "ufw-docker";
}

export type HealthVerdict = "Comfortable" | "Adequate" | "Tight" | "Overloaded";
export type StorageVerdict = "Healthy" | "Moderate" | "Warning" | "Critical";

export interface HealthStatus {
	performanceVerdict: HealthVerdict;
	storageVerdict: StorageVerdict;
	dockerRunning: boolean;
	appsRunning: number;
	appsStopped: number;
	appsTotal: number;
}

export interface VersionInfo {
	version: string;
	gitCommit: string;
	buildDate: string;
}

export type DoctorCheckStatus = "pass" | "warn" | "fail";

export interface DoctorCheckResult {
	category: string;
	name: string;
	status: DoctorCheckStatus;
	message: string;
	hint?: string;
}

export interface DoctorResult {
	checks: DoctorCheckResult[];
	issueCount: number;
	hasFail: boolean;
}
