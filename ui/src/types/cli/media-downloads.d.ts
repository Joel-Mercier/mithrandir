import type { EnvConfig } from "./config";

export const MEDIA_WEBHOOK_PATH: string;
export const MEDIA_WEBHOOK_NAME: string;
export const MEDIA_WEBHOOK_USERNAME: string;
export const LINKED_TAG: string;

export type ArrName = "radarr" | "sonarr" | "lidarr";
export type CredentialSource = "env" | "provided" | "temporary" | "none";
export type IssueSeverity = "fail" | "warn" | "info";

export interface MediaSettingsIssue {
	app: string;
	severity: IssueSeverity;
	message: string;
	fixable: boolean;
}

export interface MediaDownloadsStatus {
	relevant: boolean;
	qbittorrentInstalled: boolean;
	arrs: Array<{
		name: ArrName;
		label: string;
		installed: boolean;
		reachable: boolean;
		error?: string;
	}>;
	qbittorrent: {
		reachable: boolean;
		credentialSource: CredentialSource;
		error?: string;
	};
	uiServiceActive: boolean;
	webhookSecretConfigured: boolean;
	webhookUrl: string;
	sameFilesystem: boolean | null;
	issues: MediaSettingsIssue[];
}

export interface ApplyStepResult {
	app: string;
	message: string;
	ok: boolean;
	error?: string;
}

export interface ApplyMediaSettingsResult {
	steps: ApplyStepResult[];
	remaining: MediaSettingsIssue[];
	envUpdated: boolean;
}

export interface ApplyMediaSettingsOptions {
	credentials?: { username: string; password: string } | null;
	projectRoot?: string;
}

export type TorrentGroup = "deleted" | "partial" | "not-imported";

export interface DownloadTorrentItem {
	hash: string;
	name: string;
	category: string;
	state: string;
	group: TorrentGroup;
	autoCleanup: boolean;
	totalBytes: number;
	reclaimableBytes: number;
	mediaFiles: number;
	linkedMediaFiles: number;
	completedOn?: number;
}

export interface DownloadOrphanItem {
	path: string;
	relativePath: string;
	totalBytes: number;
	reclaimableBytes: number;
	linked: boolean;
}

export interface DownloadsScan {
	torrents: DownloadTorrentItem[];
	orphans: DownloadOrphanItem[];
	healthyCount: number;
	reclaimableBytes: number;
	orphansScanned: boolean;
	error?: string;
}

export interface PruneSelection {
	hashes: string[];
	orphanPaths: string[];
}

export interface PruneResult {
	removedTorrents: DownloadTorrentItem[];
	deletedOrphans: DownloadOrphanItem[];
	failed: Array<{ target: string; error: string }>;
	freedBytes: number;
	removedDirs: string[];
}

export interface AutoCleanupResult {
	removed: DownloadTorrentItem[];
	skipped: DownloadTorrentItem[];
	error?: string;
}

export interface MediaDoctorCheck {
	name: string;
	status: "pass" | "warn" | "fail";
	message: string;
	hint?: string;
}

export function isMediaStackInstalled(baseDir: string): boolean;
export function inspectMediaDownloads(
	env: EnvConfig,
): Promise<MediaDownloadsStatus>;
export function applyMediaDownloadSettings(
	env: EnvConfig,
	options?: ApplyMediaSettingsOptions,
): Promise<ApplyMediaSettingsResult>;
export function scanDownloads(
	env: EnvConfig,
	options?: { includeOrphans?: boolean },
): Promise<DownloadsScan>;
export function pruneDownloads(
	env: EnvConfig,
	selection: PruneSelection,
	options?: { sudoFallback?: boolean },
): Promise<PruneResult>;
export function cleanupDeletedDownloads(
	env: EnvConfig,
): Promise<AutoCleanupResult>;
export function getMediaDoctorChecks(
	env: EnvConfig,
): Promise<MediaDoctorCheck[]>;
export function allowMediaWebhookTraffic(env: EnvConfig): Promise<void>;
export function downloadClientCategoryFields(
	name: ArrName,
): Array<{ order: number; name: string; label: string; value: string }>;
export function formatBytes(bytes: number): string;
