import { shell, commandExists } from "@/lib/shell.js";
import { existsSync } from "fs";
import type { AppDefinition } from "@/types.js";
import { getContainerName } from "@/lib/apps.js";
import { TAILSCALE_INTERFACE, TAILSCALE_UDP_PORT } from "@/lib/tailscale.js";

const UFW_DOCKER_PATH = "/usr/local/bin/ufw-docker";
const UFW_DOCKER_RAW_URL =
  "https://raw.githubusercontent.com/chaifeng/ufw-docker/master/ufw-docker";

/** Check if UFW is installed */
export async function isUfwInstalled(): Promise<boolean> {
  return commandExists("ufw");
}

/** Check if ufw-docker utility is installed */
export async function isUfwDockerInstalled(): Promise<boolean> {
  return existsSync(UFW_DOCKER_PATH);
}

/** Check if UFW is active (enabled) */
export async function isUfwActive(): Promise<boolean> {
  const result = await shell("ufw", ["status"], {
    sudo: true,
    ignoreError: true,
  });
  return result.exitCode === 0 && result.stdout.includes("Status: active");
}

/** Install UFW via apt */
export async function installUfw(): Promise<void> {
  await shell("apt-get", ["update", "-qq"], { sudo: true });
  await shell("apt-get", ["install", "-y", "-qq", "ufw"], { sudo: true });
}

/** Install the ufw-docker utility script */
export async function installUfwDocker(): Promise<void> {
  await shell("bash", [
    "-c",
    `curl -fsSL "${UFW_DOCKER_RAW_URL}" -o "${UFW_DOCKER_PATH}"`,
  ], { sudo: true });
  await shell("chmod", ["+x", UFW_DOCKER_PATH], { sudo: true });

  // Apply the ufw-docker after.rules patch
  await shell(UFW_DOCKER_PATH, ["install"], { sudo: true });
}

/** Enable UFW with default deny incoming + allow SSH */
export async function enableUfw(): Promise<void> {
  await shell("ufw", ["default", "deny", "incoming"], { sudo: true });
  await shell("ufw", ["default", "allow", "outgoing"], { sudo: true });
  // Always allow SSH to prevent lockouts
  await shell("ufw", ["allow", "ssh"], { sudo: true });
  // Enable non-interactively
  await shell("ufw", ["--force", "enable"], { sudo: true });
}

/**
 * Collect the ports an app exposes.
 * Returns an array of { port, protocol, isHostNetwork } tuples.
 */
export function getAppPorts(
  app: AppDefinition,
): Array<{ port: number; protocol: string; isHostNetwork: boolean }> {
  const isHostNetwork = app.networkMode === "host";
  const ports: Array<{ port: number; protocol: string; isHostNetwork: boolean }> = [];

  if (app.port) {
    ports.push({ port: app.port, protocol: "tcp", isHostNetwork });
  }

  if (app.extraPorts) {
    for (const ep of app.extraPorts) {
      ports.push({
        port: ep.host,
        protocol: ep.protocol ?? "tcp",
        isHostNetwork,
      });
    }
  }

  return ports;
}

/**
 * Add UFW rules for an app's ports.
 * - Host-networked apps: use regular `ufw allow` (Docker doesn't manage their iptables)
 * - Bridge-networked apps: use `ufw-docker allow` (works with DOCKER-USER chain)
 */
export async function allowAppPorts(app: AppDefinition): Promise<void> {
  const ports = getAppPorts(app);
  if (ports.length === 0) return;

  const containerName = getContainerName(app);

  for (const { port, protocol, isHostNetwork } of ports) {
    if (isHostNetwork) {
      await shell("ufw", ["allow", `${port}/${protocol}`], {
        sudo: true,
        ignoreError: true,
      });
    } else {
      await shell(UFW_DOCKER_PATH, [
        "allow",
        containerName,
        `${port}/${protocol}`,
      ], { sudo: true, ignoreError: true });
    }
  }
}

/**
 * Remove UFW rules for an app's ports.
 */
export async function removeAppPorts(app: AppDefinition): Promise<void> {
  const ports = getAppPorts(app);
  if (ports.length === 0) return;

  const containerName = getContainerName(app);

  for (const { port, protocol, isHostNetwork } of ports) {
    if (isHostNetwork) {
      await shell("ufw", ["delete", "allow", `${port}/${protocol}`], {
        sudo: true,
        ignoreError: true,
      });
    } else {
      await shell(UFW_DOCKER_PATH, [
        "delete",
        "allow",
        containerName,
        `${port}/${protocol}`,
      ], { sudo: true, ignoreError: true });
    }
  }
}

/**
 * Sync UFW rules for all provided apps (used during initial setup).
 * Adds rules for each app that has ports.
 */
export async function syncAllAppPorts(apps: AppDefinition[]): Promise<void> {
  for (const app of apps) {
    await allowAppPorts(app);
  }
}

/**
 * Allow Tailscale traffic through UFW:
 * - everything arriving on the tailscale0 interface (tailnet devices are your own, authenticated devices)
 * - the WireGuard UDP port Tailscale uses for direct peer-to-peer connections
 */
export async function allowTailscaleTraffic(): Promise<void> {
  await shell("ufw", ["allow", "in", "on", TAILSCALE_INTERFACE], { sudo: true, ignoreError: true });
  await shell("ufw", ["allow", `${TAILSCALE_UDP_PORT}/udp`], { sudo: true, ignoreError: true });
}

/** Remove the Tailscale UFW rules added by allowTailscaleTraffic() */
export async function removeTailscaleTraffic(): Promise<void> {
  await shell("ufw", ["delete", "allow", "in", "on", TAILSCALE_INTERFACE], { sudo: true, ignoreError: true });
  await shell("ufw", ["delete", "allow", `${TAILSCALE_UDP_PORT}/udp`], { sudo: true, ignoreError: true });
}

/** Get a human-readable UFW status summary */
async function getUfwStatus(): Promise<string> {
  const result = await shell("ufw", ["status", "verbose"], {
    sudo: true,
    ignoreError: true,
  });
  return result.stdout;
}

/**
 * Docker bridge networks (default pools live in 172.16.0.0/12). Containers on
 * these networks reach host-side services through the host's LAN IP.
 */
export const DOCKER_BRIDGE_CIDR = "172.16.0.0/12";

/**
 * Let containers (Radarr/Sonarr/Lidarr webhooks) reach a host-side port, e.g.
 * the UI dashboard, without exposing it to the LAN.
 */
export async function allowDockerToHostPort(port: number): Promise<void> {
  await shell("ufw", ["allow", "from", DOCKER_BRIDGE_CIDR, "to", "any", "port", String(port), "proto", "tcp"], {
    sudo: true,
    ignoreError: true,
  });
}

/** Remove the rule added by allowDockerToHostPort() */
export async function removeDockerToHostPort(port: number): Promise<void> {
  await shell("ufw", ["delete", "allow", "from", DOCKER_BRIDGE_CIDR, "to", "any", "port", String(port), "proto", "tcp"], {
    sudo: true,
    ignoreError: true,
  });
}
