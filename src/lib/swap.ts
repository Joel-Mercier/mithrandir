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

const DPHYS_CONF = "/etc/dphys-swapfile";

/**
 * Ensure swap is at least `sizeGB` gigabytes.
 * Configures via dphys-swapfile (standard on Raspberry Pi OS) for persistence across reboots.
 * Falls back to manual swap file for non-RPi systems.
 */
export async function ensureSwap(sizeGB: number): Promise<void> {
  const info = await getSwapInfo();
  if (info && info.totalBytes >= sizeGB * GB) return;

  const sizeMB = String(sizeGB * 1024);

  // Check if dphys-swapfile is available (Raspberry Pi OS)
  const hasDphys = await shell("test", ["-f", DPHYS_CONF], { sudo: true, ignoreError: true });
  if (hasDphys.exitCode === 0) {
    // Configure dphys-swapfile with desired size
    await shell("sed", ["-i", `s/^.*CONF_SWAPSIZE=.*/CONF_SWAPSIZE=${sizeMB}/`, DPHYS_CONF], { sudo: true });
    // Also remove any CONF_MAXSWAP that might cap the size
    await shell("sed", ["-i", `s/^CONF_MAXSWAP=.*/#CONF_MAXSWAP=/`, DPHYS_CONF], { sudo: true });
    // Restart dphys-swapfile service to apply
    await shell("dphys-swapfile", ["swapoff"], { sudo: true, ignoreError: true });
    await shell("dphys-swapfile", ["setup"], { sudo: true });
    await shell("dphys-swapfile", ["swapon"], { sudo: true });
    return;
  }

  // Fallback: manual swap file for standard Debian/Ubuntu/Linux
  const SWAP_FILE = "/swapfile";
  await shell("swapoff", [SWAP_FILE], { sudo: true, ignoreError: true });

  // Use dd instead of fallocate — fallocate can create sparse files that
  // swapon rejects on some filesystems (btrfs, certain ext4 configs)
  const countMB = String(sizeGB * 1024);
  await shell("dd", ["if=/dev/zero", `of=${SWAP_FILE}`, "bs=1M", `count=${countMB}`, "status=none"], { sudo: true });
  await shell("chmod", ["600", SWAP_FILE], { sudo: true });
  await shell("mkswap", [SWAP_FILE], { sudo: true });
  await shell("swapon", [SWAP_FILE], { sudo: true });

  // Ensure fstab entry for persistence across reboots
  const fstab = await shell("cat", ["/etc/fstab"], { ignoreError: true });
  if (!fstab.stdout.includes(SWAP_FILE)) {
    await shell("sh", ["-c", `echo '${SWAP_FILE} none swap sw 0 0' >> /etc/fstab`], { sudo: true });
  }
}
