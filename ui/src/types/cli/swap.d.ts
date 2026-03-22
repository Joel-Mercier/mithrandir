export interface SwapInfo {
	totalBytes: number;
}

export function getSwapInfo(): Promise<SwapInfo | null>;
export function formatSwapSize(bytes: number): string;
export function ensureSwap(sizeGB: number): Promise<void>;
