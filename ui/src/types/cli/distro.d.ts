export type SupportedDistro = "debian" | "ubuntu";

export interface DistroInfo {
	id: SupportedDistro;
	versionCodename: string;
	prettyName: string;
}

export function detectDistro(): Promise<DistroInfo>;
export function getLocalIp(): Promise<string>;
