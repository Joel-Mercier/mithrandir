// ─── UI-facing types ────────────────────────────────────────────

export type AppStatus = "running" | "stopped" | "error" | "available";
export type AppCategory =
	| "media"
	| "automation"
	| "monitoring"
	| "security"
	| "utilities";

export interface DashboardApp {
	name: string;
	displayName: string;
	description: string;
	port: number;
	status: AppStatus;
	category: AppCategory;
	uptime: string;
	website?: string;
	github?: string;
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

// ─── Mock data ──────────────────────────────────────────────────

export const mockApps: DashboardApp[] = [
	{
		name: "jellyfin",
		displayName: "Jellyfin",
		description: "Media streaming server",
		port: 8096,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		website: "https://jellyfin.org",
		github: "https://github.com/jellyfin/jellyfin",
	},
	{
		name: "radarr",
		displayName: "Radarr",
		description: "Movie collection manager",
		port: 7878,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		website: "https://radarr.video",
		github: "https://github.com/Radarr/Radarr",
	},
	{
		name: "sonarr",
		displayName: "Sonarr",
		description: "TV series collection manager",
		port: 8989,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		website: "https://sonarr.tv",
		github: "https://github.com/Sonarr/Sonarr",
	},
	{
		name: "prowlarr",
		displayName: "Prowlarr",
		description: "Indexer manager",
		port: 9696,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		website: "https://prowlarr.com",
		github: "https://github.com/Prowlarr/Prowlarr",
	},
	{
		name: "qbittorrent",
		displayName: "qBittorrent",
		description: "BitTorrent client",
		port: 8080,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		website: "https://www.qbittorrent.org",
		github: "https://github.com/qbittorrent/qBittorrent",
	},
	{
		name: "homeassistant",
		displayName: "Home Assistant",
		description: "Home automation platform",
		port: 8123,
		status: "running",
		category: "automation",
		uptime: "30d 2h",
		website: "https://www.home-assistant.io",
		github: "https://github.com/home-assistant/core",
	},
	{
		name: "pihole",
		displayName: "Pi-hole",
		description: "Network-wide ad blocker",
		port: 8053,
		status: "running",
		category: "security",
		uptime: "30d 2h",
		website: "https://pi-hole.net",
		github: "https://github.com/pi-hole/pi-hole",
	},
	{
		name: "homarr",
		displayName: "Homarr",
		description: "Dashboard for your server",
		port: 7575,
		status: "stopped",
		category: "utilities",
		uptime: "—",
		website: "https://homarr.dev",
		github: "https://github.com/ajnart/homarr",
	},
	{
		name: "bazarr",
		displayName: "Bazarr",
		description: "Subtitle manager for Sonarr & Radarr",
		port: 6767,
		status: "available",
		category: "media",
		uptime: "—",
		website: "https://www.bazarr.media",
		github: "https://github.com/morpheus65535/bazarr",
	},
	{
		name: "lidarr",
		displayName: "Lidarr",
		description: "Music collection manager",
		port: 8686,
		status: "available",
		category: "media",
		uptime: "—",
		website: "https://lidarr.audio",
		github: "https://github.com/Lidarr/Lidarr",
	},
	{
		name: "jellyseerr",
		displayName: "Seerr",
		description: "Media request management",
		port: 5055,
		status: "available",
		category: "media",
		uptime: "—",
		website: "https://github.com/seerr-team/seerr",
		github: "https://github.com/seerr-team/seerr",
	},
	{
		name: "navidrome",
		displayName: "Navidrome",
		description: "Music server and streamer",
		port: 4533,
		status: "available",
		category: "media",
		uptime: "—",
		website: "https://www.navidrome.org",
		github: "https://github.com/navidrome/navidrome",
	},
	{
		name: "immich",
		displayName: "Immich",
		description: "Self-hosted photo & video backup",
		port: 2283,
		status: "available",
		category: "media",
		uptime: "—",
		website: "https://immich.app",
		github: "https://github.com/immich-app/immich",
	},
	{
		name: "gatus",
		displayName: "Gatus",
		description: "Automated service health dashboard",
		port: 8084,
		status: "available",
		category: "monitoring",
		uptime: "—",
		website: "https://gatus.io",
		github: "https://github.com/TwiN/gatus",
	},
	{
		name: "wireguard",
		displayName: "WireGuard",
		description: "Fast VPN tunnel",
		port: 51821,
		status: "available",
		category: "security",
		uptime: "—",
		website: "https://www.wireguard.com",
		github: "https://github.com/linuxserver/docker-wireguard",
	},
	{
		name: "vaultwarden",
		displayName: "Vaultwarden",
		description: "Lightweight Bitwarden-compatible server",
		port: 8880,
		status: "available",
		category: "security",
		uptime: "—",
		website: "https://github.com/dani-garcia/vaultwarden",
		github: "https://github.com/dani-garcia/vaultwarden",
	},
	{
		name: "n8n",
		displayName: "n8n",
		description: "Workflow automation tool",
		port: 5678,
		status: "available",
		category: "automation",
		uptime: "—",
		website: "https://n8n.io",
		github: "https://github.com/n8n-io/n8n",
	},
	{
		name: "excalidraw",
		displayName: "Excalidraw",
		description: "Collaborative whiteboard",
		port: 3030,
		status: "available",
		category: "utilities",
		uptime: "—",
		website: "https://excalidraw.com",
		github: "https://github.com/excalidraw/excalidraw",
	},
	{
		name: "stirling-pdf",
		displayName: "Stirling PDF",
		description: "PDF manipulation tools",
		port: 8085,
		status: "available",
		category: "utilities",
		uptime: "—",
		website: "https://stirlingpdf.io",
		github: "https://github.com/Stirling-Tools/Stirling-PDF",
	},
	{
		name: "actual-budget",
		displayName: "Actual Budget",
		description: "Privacy-focused budgeting app",
		port: 5006,
		status: "available",
		category: "utilities",
		uptime: "—",
		website: "https://actualbudget.org",
		github: "https://github.com/actualbudget/actual",
	},
	{
		name: "paperless-ngx",
		displayName: "Paperless-ngx",
		description: "Document management system",
		port: 8000,
		status: "available",
		category: "utilities",
		uptime: "—",
		website: "https://docs.paperless-ngx.com",
		github: "https://github.com/paperless-ngx/paperless-ngx",
	},
];

export const mockAppDetails: Record<string, AppDetail> = {
	jellyfin: {
		name: "jellyfin",
		displayName: "Jellyfin",
		description: "Media streaming server",
		port: 8096,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		image: "jellyfin/jellyfin:latest",
		configPath: "/opt/homelab/jellyfin/config",
		volumes: [
			"/opt/homelab/jellyfin/config:/config",
			"/mnt/data/media:/media:ro",
		],
		cpuUsage: 8,
		ramUsageMB: 512,
		networkRx: "2.4 GB",
		networkTx: "48.1 GB",
		restarts: 0,
		createdAt: "2026-03-01T10:00:00Z",
		logs: [
			"[2026-03-15 08:00:12] [INF] Jellyfin version 10.9.6",
			"[2026-03-15 08:00:12] [INF] Arguments: /jellyfin/jellyfin --datadir=/config --cachedir=/cache --logdir=/config/log",
			"[2026-03-15 08:00:13] [INF] Operating system: Linux",
			"[2026-03-15 08:00:13] [INF] Architecture: X64",
			"[2026-03-15 08:00:13] [INF] 64-Bit Process: True",
			"[2026-03-15 08:00:14] [INF] Loaded plugin: TMDb 22.0.0.0",
			"[2026-03-15 08:00:14] [INF] Loaded plugin: Open Subtitles 22.0.0.0",
			"[2026-03-15 08:00:15] [INF] User policy for admin: IsAdministrator",
			"[2026-03-15 08:00:15] [INF] Kestrel listening on http://[::]:8096",
			"[2026-03-15 08:00:15] [INF] Startup complete",
			"[2026-03-15 10:23:44] [INF] Library scan complete. 1247 items found.",
			"[2026-03-15 12:01:00] [INF] Scheduled task: Scan Media Library completed.",
		],
	},
	radarr: {
		name: "radarr",
		displayName: "Radarr",
		description: "Movie collection manager",
		port: 7878,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		image: "linuxserver/radarr:latest",
		configPath: "/opt/homelab/radarr/config",
		volumes: [
			"/opt/homelab/radarr/config:/config",
			"/mnt/data/downloads:/downloads",
			"/mnt/data/media/movies:/movies",
		],
		cpuUsage: 2,
		ramUsageMB: 256,
		networkRx: "180 MB",
		networkTx: "45 MB",
		restarts: 0,
		createdAt: "2026-03-01T10:00:00Z",
		logs: [
			"[Info] Radarr v5.14.0.9383 started",
			"[Info] AppUpdatedCheck: No update available",
			"[Info] RSS Sync completed. 0 reports processed.",
			"[Info] DownloadDecision: 0 releases accepted, 12 rejected",
		],
	},
	sonarr: {
		name: "sonarr",
		displayName: "Sonarr",
		description: "TV series collection manager",
		port: 8989,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		image: "linuxserver/sonarr:latest",
		configPath: "/opt/homelab/sonarr/config",
		volumes: [
			"/opt/homelab/sonarr/config:/config",
			"/mnt/data/downloads:/downloads",
			"/mnt/data/media/tv:/tv",
		],
		cpuUsage: 1,
		ramUsageMB: 192,
		networkRx: "120 MB",
		networkTx: "30 MB",
		restarts: 0,
		createdAt: "2026-03-01T10:00:00Z",
		logs: [
			"[Info] Sonarr v4.0.11.2680 started",
			"[Info] RSS Sync completed. 0 reports processed.",
			"[Info] Completed search for missing episodes",
		],
	},
	prowlarr: {
		name: "prowlarr",
		displayName: "Prowlarr",
		description: "Indexer manager",
		port: 9696,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		image: "linuxserver/prowlarr:latest",
		configPath: "/opt/homelab/prowlarr/config",
		volumes: ["/opt/homelab/prowlarr/config:/config"],
		cpuUsage: 1,
		ramUsageMB: 128,
		networkRx: "50 MB",
		networkTx: "12 MB",
		restarts: 0,
		createdAt: "2026-03-01T10:00:00Z",
		logs: [
			"[Info] Prowlarr v1.28.2.4885 started",
			"[Info] 6 indexers configured",
			"[Info] Sync completed with Radarr, Sonarr",
		],
	},
	qbittorrent: {
		name: "qbittorrent",
		displayName: "qBittorrent",
		description: "BitTorrent client",
		port: 8080,
		status: "running",
		category: "media",
		uptime: "14d 6h",
		image: "linuxserver/qbittorrent:latest",
		configPath: "/opt/homelab/qbittorrent/config",
		volumes: [
			"/opt/homelab/qbittorrent/config:/config",
			"/mnt/data/downloads:/downloads",
		],
		cpuUsage: 5,
		ramUsageMB: 384,
		networkRx: "124.5 GB",
		networkTx: "89.2 GB",
		restarts: 0,
		createdAt: "2026-03-01T10:00:00Z",
		logs: [
			"[Info] qBittorrent v5.0.3 started",
			"[Info] Peer ID: -qB5030-",
			"[Info] Using libtorrent v2.0.11",
			"[Info] Active torrents: 3, Seeding: 12",
		],
	},
	homeassistant: {
		name: "homeassistant",
		displayName: "Home Assistant",
		description: "Home automation platform",
		port: 8123,
		status: "running",
		category: "automation",
		uptime: "30d 2h",
		image: "ghcr.io/home-assistant/home-assistant:stable",
		configPath: "/opt/homelab/homeassistant/data",
		volumes: ["/opt/homelab/homeassistant/data:/config"],
		cpuUsage: 4,
		ramUsageMB: 420,
		networkRx: "890 MB",
		networkTx: "210 MB",
		restarts: 0,
		createdAt: "2026-02-13T08:00:00Z",
		logs: [
			"[homeassistant.core] Starting Home Assistant",
			"[homeassistant.core] Timer:starting",
			"[homeassistant.components.zha] ZHA startup complete",
			"[homeassistant.components.mqtt] Connected to MQTT broker",
			"[homeassistant.core] Home Assistant initialized in 14.2s",
		],
	},
	pihole: {
		name: "pihole",
		displayName: "Pi-hole",
		description: "Network-wide ad blocker",
		port: 8053,
		status: "running",
		category: "security",
		uptime: "30d 2h",
		image: "pihole/pihole:latest",
		configPath: "/opt/homelab/pihole/config",
		volumes: [
			"/opt/homelab/pihole/config/etc-pihole:/etc/pihole",
			"/opt/homelab/pihole/config/etc-dnsmasq.d:/etc/dnsmasq.d",
		],
		cpuUsage: 1,
		ramUsageMB: 96,
		networkRx: "1.2 GB",
		networkTx: "980 MB",
		restarts: 0,
		createdAt: "2026-02-13T08:00:00Z",
		logs: [
			"[FTL] Starting Pi-hole FTL engine",
			"[FTL] Loaded 142,891 domains for blocking",
			"[FTL] DNS service started (port 53)",
			"[FTL] Queries today: 24,891 | Blocked: 4,201 (16.9%)",
		],
	},
	homarr: {
		name: "homarr",
		displayName: "Homarr",
		description: "Dashboard for your server",
		port: 7575,
		status: "stopped",
		category: "utilities",
		uptime: "—",
		image: "ghcr.io/ajnart/homarr:latest",
		configPath: "/opt/homelab/homarr/configs",
		volumes: [
			"/opt/homelab/homarr/configs:/app/data/configs",
			"/opt/homelab/homarr/icons:/app/public/icons",
			"/opt/homelab/homarr/data:/data",
		],
		cpuUsage: 0,
		ramUsageMB: 0,
		networkRx: "—",
		networkTx: "—",
		restarts: 2,
		createdAt: "2026-03-01T10:00:00Z",
		logs: [
			"[Info] Homarr v0.15.7 stopped by user",
			"[Info] Graceful shutdown complete",
		],
	},
};

export const mockBackupHistory: BackupEntry[] = [
	{
		date: "2026-03-15T02:00:00Z",
		size: "2.4 GB",
		apps: 8,
		encrypted: true,
		location: "local",
		verified: true,
	},
	{
		date: "2026-03-15T02:05:00Z",
		size: "2.4 GB",
		apps: 8,
		encrypted: true,
		location: "remote",
		remote: "gdrive",
		verified: true,
	},
	{
		date: "2026-03-14T02:00:00Z",
		size: "2.3 GB",
		apps: 8,
		encrypted: true,
		location: "local",
		verified: true,
	},
	{
		date: "2026-03-14T02:05:00Z",
		size: "2.3 GB",
		apps: 8,
		encrypted: true,
		location: "remote",
		remote: "gdrive",
		verified: true,
	},
	{
		date: "2026-03-13T02:00:00Z",
		size: "2.3 GB",
		apps: 8,
		encrypted: true,
		location: "local",
		verified: false,
	},
	{
		date: "2026-03-13T02:04:00Z",
		size: "2.3 GB",
		apps: 8,
		encrypted: true,
		location: "remote",
		remote: "gdrive",
		verified: false,
	},
	{
		date: "2026-03-12T02:00:00Z",
		size: "2.2 GB",
		apps: 7,
		encrypted: true,
		location: "local",
		verified: true,
	},
	{
		date: "2026-03-11T02:00:00Z",
		size: "2.2 GB",
		apps: 7,
		encrypted: true,
		location: "local",
		verified: true,
	},
];

export const mockResources: SystemResources = {
	cpuModel: "Intel Core i5-8500T",
	cores: 4,
	cpuUsage: 23,
	ramTotalGB: 16,
	ramUsedGB: 9.4,
	mounts: [
		{ path: "/", totalGB: 500, usedGB: 310 },
		{ path: "/mnt/data", totalGB: 2000, usedGB: 1240 },
	],
};

export const mockBackup: BackupStatus = {
	lastBackupDate: "2026-03-14T02:00:00Z",
	nextScheduledHour: 2,
	localRetention: 5,
	remoteRetention: 10,
	remotes: ["gdrive"],
	encrypted: true,
};

export const mockConfig: SystemConfig = {
	baseDir: "/opt/homelab",
	timezone: "Europe/Paris",
	httpsEnabled: true,
	firewallEnabled: true,
	acmeEmail: "admin@example.com",
	duckdnsDomain: "myhomelab.duckdns.org",
	backupDir: "/backups",
	backupHour: 2,
	backupPassword: true,
	localRetention: 5,
	remoteRetention: 10,
	remotes: ["gdrive"],
	puid: 1000,
	pgid: 1000,
};

export const mockHealth: HealthStatus = {
	performanceVerdict: "Comfortable",
	storageVerdict: "Moderate",
	dockerRunning: true,
	appsRunning: 7,
	appsStopped: 1,
	appsTotal: 8,
};

export const mockVersion: VersionInfo = {
	version: "1.0.0",
	gitCommit: "ad8b208f3e",
	buildDate: "2026-03-10",
};
