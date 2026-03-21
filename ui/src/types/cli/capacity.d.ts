export interface StorageInfo {
	mountpoint: string;
	totalBytes: number;
	usedBytes: number;
	availBytes: number;
}

export function scoreToNumeric(score: "low" | "medium" | "high"): number;
export function scoreLabel(score: "low" | "medium" | "high"): string;
export function scoreColor(score: "low" | "medium" | "high"): string;
export function formatBytes(bytes: number): string;
export function getPerformanceVerdict(
	totalScore: number,
	cpuCores: number,
	ramMB: number,
): { label: string; color: string };
export function getStorageVerdict(
	storage: StorageInfo[],
): { label: string; color: string };
