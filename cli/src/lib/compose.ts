import type { AppDefinition, EnvConfig } from "../types.js";
import { getAppDir } from "./apps.js";

/**
 * Generate a docker-compose.yml string for an app.
 * Replaces the duplicated compose blocks in setup.sh.
 */
export function generateCompose(
  app: AppDefinition,
  envConfig: EnvConfig,
): string {
  const baseDir = envConfig.BASE_DIR;
  const appDir = getAppDir(app, baseDir);
  const dataDir = `${baseDir}/data`;
  const containerName = app.containerName ?? app.name;
  const restartPolicy = app.restartPolicy ?? "unless-stopped";

  const lines: string[] = [];
  lines.push("services:");
  lines.push(`  ${containerName}:`);
  lines.push(`    image: ${app.image}`);
  lines.push(`    container_name: ${containerName}`);

  if (app.init) {
    lines.push("    init: true");
  }

  if (app.user) {
    lines.push(`    user: "${app.user}"`);
  } else if (app.name === "navidrome") {
    lines.push(`    user: "${envConfig.PUID}:${envConfig.PGID}"`);
  }

  // Network mode
  if (app.networkMode === "host") {
    lines.push("    network_mode: host");
  }

  // Capabilities
  if (app.capAdd && app.capAdd.length > 0) {
    lines.push("    cap_add:");
    for (const cap of app.capAdd) {
      lines.push(`      - ${cap}`);
    }
  }

  // Sysctls
  if (app.sysctls) {
    lines.push("    sysctls:");
    for (const [key, value] of Object.entries(app.sysctls)) {
      lines.push(`      - ${key}=${value}`);
    }
  }

  // Environment
  const env: Record<string, string> = {};

  // Standard LinuxServer env vars (unless image doesn't use them)
  const isLinuxServer = app.image.includes("linuxserver");
  if (isLinuxServer) {
    env.PUID = envConfig.PUID;
    env.PGID = envConfig.PGID;
  }
  env.TZ = envConfig.TZ;

  // App-specific static env
  if (app.environment) {
    Object.assign(env, app.environment);
  }

  // Secrets from env config
  if (app.secrets) {
    for (const secret of app.secrets) {
      const value = envConfig[secret.envVar];
      if (value) {
        // Map env var names to compose env var names
        const composeKey = mapSecretToComposeVar(app.name, secret.envVar);
        env[composeKey] = value;
      }
    }
  }

  if (Object.keys(env).length > 0) {
    lines.push("    environment:");
    for (const [key, value] of Object.entries(env)) {
      lines.push(`      - ${key}=${value}`);
    }
  }

  // Ports (skip if host networking)
  if (app.networkMode !== "host") {
    const ports: string[] = [];
    if (app.port) {
      ports.push(`${app.port}:${app.port}`);
    }
    if (app.extraPorts) {
      for (const p of app.extraPorts) {
        const proto = p.protocol ? `/${p.protocol}` : "";
        ports.push(`${p.host}:${p.container}${proto}`);
      }
    }
    if (ports.length > 0) {
      lines.push("    ports:");
      for (const port of ports) {
        lines.push(`      - ${port}`);
      }
    }
  }

  // Volumes
  const volumes: string[] = [];

  // Docker socket
  if (app.mountDockerSocket) {
    volumes.push("/var/run/docker.sock:/var/run/docker.sock");
  }

  // Config volumes
  if (app.configSubdir === "multiple" && app.multipleConfigDirs) {
    // Homarr special case
    const volumeMap: Record<string, string> = {
      configs: "/app/data/configs",
      icons: "/app/public/icons",
      data: "/data",
    };
    for (const dir of app.multipleConfigDirs) {
      const containerPath = volumeMap[dir] ?? `/${dir}`;
      volumes.push(`${appDir}/${dir}:${containerPath}`);
    }
  } else {
    // Standard config mount
    const containerConfigPath = getContainerConfigPath(app);
    volumes.push(`${appDir}/${app.configSubdir}:${containerConfigPath}`);
  }

  // Data directory
  if (app.needsDataDir) {
    const ro = app.dataDirReadOnly ? ":ro" : "";
    volumes.push(`${dataDir}:/data${ro}`);
  }

  // Music directory for Navidrome
  if (app.mountMusicDir) {
    volumes.push(`${dataDir}/media/music:/music:ro`);
  }

  // Extra volumes
  if (app.extraVolumes) {
    for (const vol of app.extraVolumes) {
      const opts = vol.options ? `:${vol.options}` : "";
      // If host path is relative, it's relative to appDir
      const hostPath = vol.host.startsWith("/")
        ? vol.host
        : `${appDir}/${vol.host}`;
      volumes.push(`${hostPath}:${vol.container}${opts}`);
    }
  }

  if (volumes.length > 0) {
    lines.push("    volumes:");
    for (const vol of volumes) {
      lines.push(`      - ${vol}`);
    }
  }

  // Healthcheck
  if (app.healthcheck) {
    lines.push("    healthcheck:");
    lines.push(
      `      test: ["CMD-SHELL", "${app.healthcheck.test}"]`,
    );
    if (app.healthcheck.startPeriod)
      lines.push(`      start_period: ${app.healthcheck.startPeriod}`);
    if (app.healthcheck.timeout)
      lines.push(`      timeout: ${app.healthcheck.timeout}`);
    if (app.healthcheck.interval)
      lines.push(`      interval: ${app.healthcheck.interval}`);
    if (app.healthcheck.retries)
      lines.push(`      retries: ${app.healthcheck.retries}`);
  }

  lines.push(`    restart: ${restartPolicy}`);

  return lines.join("\n") + "\n";
}

/** Map container config mount path based on app type */
function getContainerConfigPath(app: AppDefinition): string {
  switch (app.name) {
    case "jellyseerr":
      return "/app/config";
    case "seerr":
      return "/app/config";
    case "navidrome":
      return "/data";
    case "uptime-kuma":
      return "/app/data";
    default:
      return "/config";
  }
}

/**
 * Map .env secret variable names to docker-compose environment variable names.
 * Some apps use different variable names internally vs in .env.
 */
function mapSecretToComposeVar(appName: string, envVar: string): string {
  const mapping: Record<string, string> = {
    DUCKDNS_SUBDOMAINS: "SUBDOMAINS",
    DUCKDNS_TOKEN: "TOKEN",
    WG_SERVERURL: "SERVERURL",
    WG_PEERS: "PEERS",
  };
  return mapping[envVar] ?? envVar;
}
