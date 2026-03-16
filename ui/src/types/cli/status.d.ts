import type { AppDefinition } from "./apps";

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

export function gatherSystemInfo(projectRoot?: string): Promise<SystemInfo>;
export function detectInstalledApps(baseDir: string): AppDefinition[];
export function getContainerStatus(app: AppDefinition): Promise<string>;
