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
