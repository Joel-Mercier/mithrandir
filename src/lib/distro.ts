import { readFileSync, existsSync } from "fs";
import { shell } from "@/lib/shell.js";

export type SupportedDistro = "debian" | "ubuntu";

export interface DistroInfo {
  id: SupportedDistro;
  versionCodename: string;
  prettyName: string;
}

/**
 * Parse /etc/os-release into a key-value map.
 * Handles both quoted and unquoted values.
 */
function parseOsRelease(): Record<string, string> {
  const content = readFileSync("/etc/os-release", "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      // Strip surrounding quotes if present
      result[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return result;
}

/** Detect the Linux distribution. Throws if unsupported. */
export async function detectDistro(): Promise<DistroInfo> {
  if (!existsSync("/etc/os-release")) {
    throw new Error("Cannot detect distro: /etc/os-release not found");
  }

  const osRelease = parseOsRelease();

  const distroId = (osRelease.ID ?? "").toLowerCase();
  if (distroId !== "debian" && distroId !== "ubuntu") {
    throw new Error(
      `Unsupported distro: ${distroId || "unknown"}. Only Debian and Ubuntu are supported.`,
    );
  }

  return {
    id: distroId as SupportedDistro,
    versionCodename: osRelease.VERSION_CODENAME ?? "",
    prettyName: osRelease.PRETTY_NAME ?? "",
  };
}

/** Get the local IP address */
export async function getLocalIp(): Promise<string> {
  const result = await shell("ip", ["route", "get", "1.1.1.1"], {
    ignoreError: true,
  });

  if (result.exitCode !== 0 || !result.stdout) return "localhost";

  // Output looks like: "1.1.1.1 via 192.168.1.1 dev eth0 src 192.168.1.100 uid 1000"
  // Extract the IP after "src"
  const match = result.stdout.match(/\bsrc\s+(\S+)/);
  return match?.[1] ?? "localhost";
}
