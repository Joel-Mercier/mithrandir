export interface QBittorrentPreferences {
	locale?: string;
	save_path?: string;
	auto_tmm_enabled?: boolean;
	web_ui_username?: string;
	web_ui_password?: string;
	[key: string]: unknown;
}

export interface LoginResult {
	success: boolean;
	sid?: string;
	banned?: boolean;
}

export interface QBittorrentCredentials {
	username: string;
	password: string;
	isTemporary: boolean;
}

export interface QBittorrentClientOptions {
	baseUrl?: string;
	sid?: string;
}

export function getQBittorrentCredentials(
	baseDir: string,
	containerName?: string,
): Promise<QBittorrentCredentials | null>;

export function createQBittorrentClient(options?: QBittorrentClientOptions): {
	auth: {
		login(username: string, password: string): Promise<LoginResult>;
		logout(): Promise<string>;
	};
	app: {
		getPreferences(): Promise<QBittorrentPreferences>;
		setPreferences(prefs: Partial<QBittorrentPreferences>): Promise<string>;
	};
	getSid(): string | undefined;
};

export type QBittorrentClient = ReturnType<typeof createQBittorrentClient>;
