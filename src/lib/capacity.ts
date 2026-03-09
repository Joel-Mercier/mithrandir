import { APP_REGISTRY, getComposePath, getAppDir } from "@/lib/apps.js";
import { loadEnvConfig } from "@/lib/config.js";
import { shell } from "@/lib/shell.js";
import type { AppDefinition, EnvConfig } from "@/types.js";
import { existsSync } from "fs";
import { platform } from "os";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SystemResources {
  cpuModel: string;
  cpuCores: number;
  ramTotalMB: number;
  storage: StorageInfo[];
}

export interface StorageInfo {
  mountpoint: string;
  totalBytes: number;
  usedBytes: number;
  availBytes: number;
}

export interface AppCapacityInfo {
  app: AppDefinition;
  installed: boolean;
  diskUsage: string;
  performanceScore: "low" | "medium" | "high";
  storageScore: "low" | "medium" | "high";
  note: string;
}

export interface CapacityReport {
  system: SystemResources;
  apps: AppCapacityInfo[];
  totalPerformanceScore: number;
  maxPerformanceScore: number;
  totalStorageScore: number;
  maxStorageScore: number;
  storageVerdict: { label: string; color: string };
  performanceVerdict: { label: string; color: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function scoreToNumeric(score: "low" | "medium" | "high"): number {
  return score === "low" ? 1 : score === "medium" ? 2 : 3;
}

export function scoreLabel(score: "low" | "medium" | "high"): string {
  return score === "low" ? "Low" : score === "medium" ? "Medium" : "High";
}

export function scoreColor(score: "low" | "medium" | "high"): string {
  return score === "low" ? "green" : score === "medium" ? "yellow" : "red";
}

// ─── System detection ───────────────────────────────────────────────────────

async function getCpuInfo(): Promise<{ model: string; cores: number }> {
  if (platform() === "darwin") {
    const [modelResult, coreResult] = await Promise.all([
      shell("sysctl", ["-n", "machdep.cpu.brand_string"], { ignoreError: true }),
      shell("sysctl", ["-n", "hw.ncpu"], { ignoreError: true }),
    ]);
    return {
      model: modelResult.stdout.trim() || "Unknown",
      cores: parseInt(coreResult.stdout.trim()) || 1,
    };
  }

  const [modelResult, coreResult] = await Promise.all([
    shell("grep", ["-m1", "model name", "/proc/cpuinfo"], { ignoreError: true }),
    shell("nproc", [], { ignoreError: true }),
  ]);

  const model = modelResult.stdout.trim().replace(/^model name\s*:\s*/, "") || "Unknown";
  const cores = parseInt(coreResult.stdout.trim()) || 1;
  return { model, cores };
}

async function getRamMB(): Promise<number> {
  if (platform() === "darwin") {
    const result = await shell("sysctl", ["-n", "hw.memsize"], { ignoreError: true });
    const bytes = parseInt(result.stdout.trim());
    return isNaN(bytes) ? 0 : Math.round(bytes / 1024 / 1024);
  }

  const result = await shell("grep", ["MemTotal", "/proc/meminfo"], { ignoreError: true });
  const match = result.stdout.match(/(\d+)\s*kB/);
  return match ? Math.round(parseInt(match[1]) / 1024) : 0;
}

async function getStorageInfo(paths: string[]): Promise<StorageInfo[]> {
  const uniquePaths = [...new Set(paths.filter((p) => existsSync(p)))];
  if (uniquePaths.length === 0) return [];

  const dfArgs = platform() === "darwin"
    ? ["-k", ...uniquePaths]
    : ["-B1", "--output=source,size,used,avail,target", ...uniquePaths];

  const result = await shell("df", dfArgs, { ignoreError: true });
  if (result.exitCode !== 0 || !result.stdout.trim()) return [];

  const lines = result.stdout.trim().split("\n").slice(1);
  const seen = new Set<string>();
  const infos: StorageInfo[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;

    if (platform() === "darwin") {
      // df -k on macOS: Filesystem 1024-blocks Used Available Capacity Mounted
      const [, blocksStr, usedStr, availStr, , ...mountParts] = parts;
      const mountpoint = mountParts.join(" ");
      if (seen.has(mountpoint)) continue;
      seen.add(mountpoint);
      infos.push({
        mountpoint,
        totalBytes: parseInt(blocksStr) * 1024,
        usedBytes: parseInt(usedStr) * 1024,
        availBytes: parseInt(availStr) * 1024,
      });
    } else {
      // df -B1 on Linux: Source Size Used Avail Target
      const [, totalStr, usedStr, availStr, ...targetParts] = parts;
      const mountpoint = targetParts.join(" ");
      if (seen.has(mountpoint)) continue;
      seen.add(mountpoint);
      infos.push({
        mountpoint,
        totalBytes: parseInt(totalStr),
        usedBytes: parseInt(usedStr),
        availBytes: parseInt(availStr),
      });
    }
  }

  return infos;
}

// ─── Disk usage ─────────────────────────────────────────────────────────────

async function getDiskUsage(app: AppDefinition, baseDir: string): Promise<string> {
  const appDir = getAppDir(app, baseDir);
  if (!existsSync(appDir)) return "—";
  const result = await shell("du", ["-sh", appDir], {
    sudo: true,
    ignoreError: true,
    timeout: 10000,
  });
  if (result.exitCode !== 0 || !result.stdout.trim()) return "—";
  return result.stdout.trim().split(/\s+/)[0] || "—";
}

// ─── Verdicts ───────────────────────────────────────────────────────────────

export function getPerformanceVerdict(
  totalScore: number,
  cpuCores: number,
  ramMB: number,
): { label: string; color: string } {
  // Simple heuristic: each "point" of performance score needs ~0.5 cores and ~512MB RAM
  const cpuHeadroom = cpuCores / Math.max(totalScore * 0.5, 1);
  const ramHeadroom = ramMB / Math.max(totalScore * 512, 1);
  const headroom = Math.min(cpuHeadroom, ramHeadroom);

  if (headroom >= 2) return { label: "Comfortable", color: "green" };
  if (headroom >= 1) return { label: "Adequate", color: "yellow" };
  if (headroom >= 0.5) return { label: "Tight", color: "red" };
  return { label: "Overloaded", color: "red" };
}

export function getStorageVerdict(
  storage: StorageInfo[],
): { label: string; color: string } {
  if (storage.length === 0) return { label: "Unknown", color: "gray" };

  // Use the most constrained mount point
  let worstPct = 0;
  for (const s of storage) {
    if (s.totalBytes === 0) continue;
    const pct = (s.usedBytes / s.totalBytes) * 100;
    if (pct > worstPct) worstPct = pct;
  }

  if (worstPct >= 95) return { label: "Critical", color: "red" };
  if (worstPct >= 80) return { label: "Warning", color: "yellow" };
  if (worstPct >= 60) return { label: "Moderate", color: "yellow" };
  return { label: "Healthy", color: "green" };
}

// ─── Report ─────────────────────────────────────────────────────────────────

export async function gatherCapacityReport(): Promise<CapacityReport> {
  const envConfig = await loadEnvConfig();
  const baseDir = envConfig.BASE_DIR;
  const backupDir = envConfig.BACKUP_DIR ?? "/backups";

  // Gather system info
  const [cpuInfo, ramMB, storage] = await Promise.all([
    getCpuInfo(),
    getRamMB(),
    getStorageInfo([baseDir, backupDir]),
  ]);

  const system: SystemResources = {
    cpuModel: cpuInfo.model,
    cpuCores: cpuInfo.cores,
    ramTotalMB: ramMB,
    storage,
  };

  // Gather per-app info
  const visibleApps = APP_REGISTRY.filter((app) => !app.companionOf);
  const apps = await Promise.all(
    visibleApps.map(async (app): Promise<AppCapacityInfo> => {
      const installed = existsSync(getComposePath(app, baseDir));
      const diskUsage = installed ? await getDiskUsage(app, baseDir) : "—";
      const capacity = app.capacity ?? { performance: "low" as const, storage: "low" as const };
      return {
        app,
        installed,
        diskUsage,
        performanceScore: capacity.performance,
        storageScore: capacity.storage,
        note: capacity.note ?? "",
      };
    }),
  );

  // Calculate aggregate scores (only installed apps)
  const installedApps = apps.filter((a) => a.installed);
  const totalPerformanceScore = installedApps.reduce((sum, a) => sum + scoreToNumeric(a.performanceScore), 0);
  const totalStorageScore = installedApps.reduce((sum, a) => sum + scoreToNumeric(a.storageScore), 0);
  const maxPerformanceScore = installedApps.length * 3;
  const maxStorageScore = installedApps.length * 3;

  return {
    system,
    apps,
    totalPerformanceScore,
    maxPerformanceScore,
    totalStorageScore,
    maxStorageScore,
    performanceVerdict: getPerformanceVerdict(totalPerformanceScore, cpuInfo.cores, ramMB),
    storageVerdict: getStorageVerdict(storage),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
