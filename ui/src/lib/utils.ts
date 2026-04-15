import type { QueryClient } from "@tanstack/react-query";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { m } from "#/paraglide/messages.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUptime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
  if (diffHours > 0) return `${diffHours}h`;
  const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffMin}m`;
}

export function parseMemoryMB(mem: string): number {
  const match = mem.match(/^([0-9.]+)\s*([a-zA-Z]+)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GIB" || unit === "GB") return num * 1024;
  if (unit === "MIB" || unit === "MB") return num;
  if (unit === "KIB" || unit === "KB") return num / 1024;
  return num;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function invalidateKeys(
  queryClient: QueryClient,
  queryKeys: readonly (readonly unknown[])[],
) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      queryKeys.some(
        (key) =>
          query.queryKey.length >= key.length &&
          key.every((k, i) => query.queryKey[i] === k),
      ),
  });
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return m.activity_justNow();
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}