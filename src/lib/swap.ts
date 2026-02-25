import { shell } from "@/lib/shell.js";

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export interface SwapInfo {
  totalBytes: number;
}

/**
 * Get current swap size by parsing `free -b`.
 * Returns null if swap info can't be determined.
 */
export async function getSwapInfo(): Promise<SwapInfo | null> {
  const result = await shell("free", ["-b"], { ignoreError: true });
  if (result.exitCode !== 0) return null;

  for (const line of result.stdout.split("\n")) {
    if (line.startsWith("Swap:")) {
      const parts = line.split(/\s+/);
      const total = parseInt(parts[1], 10);
      if (isNaN(total)) return null;
      return { totalBytes: total };
    }
  }
  return null;
}

/**
 * Format bytes into a human-readable swap size string.
 */
export function formatSwapSize(bytes: number): string {
  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)} GB`;
  }
  return `${Math.round(bytes / MB)} MB`;
}

const SWAP_FILE = "/var/swap";

/**
 * Ensure swap is at least `sizeGB` gigabytes.
 * If current swap is less, reconfigure /var/swap to the target size.
 * Persists via /etc/fstab.
 */
export async function ensureSwap(sizeGB: number): Promise<void> {
  const info = await getSwapInfo();
  if (info && info.totalBytes >= sizeGB * GB) return;

  // Disable existing swap file if present
  await shell("swapoff", [SWAP_FILE], { sudo: true, ignoreError: true });

  // Create swap file
  const sizeBytes = String(sizeGB * GB);
  await shell("fallocate", ["-l", sizeBytes, SWAP_FILE], { sudo: true });
  await shell("chmod", ["600", SWAP_FILE], { sudo: true });
  await shell("mkswap", [SWAP_FILE], { sudo: true });
  await shell("swapon", [SWAP_FILE], { sudo: true });

  // Ensure fstab entry for persistence
  const fstab = await shell("cat", ["/etc/fstab"], { ignoreError: true });
  if (!fstab.stdout.includes(SWAP_FILE)) {
    await shell("sh", ["-c", `echo '${SWAP_FILE} none swap sw 0 0' >> /etc/fstab`], { sudo: true });
  }
}
