import type { AppDefinition } from "@/types.js";

/**
 * Single source of truth for all mithrandir services.
 * Replaces get_app_config() in backup.sh/restore.sh, VALID_APPS in setup.sh,
 * and per-app compose blocks in setup.sh.
 */
export const APP_REGISTRY: AppDefinition[] = [
  {
    name: "homeassistant",
    displayName: "Home Assistant",
    description: "Open-source home automation platform",
    image: "lscr.io/linuxserver/homeassistant:latest",
    port: 8123,
    configSubdir: "data",
    networkMode: "host",
    needsDataDir: false,
  },
  {
    name: "qbittorrent",
    displayName: "qBittorrent",
    description: "BitTorrent client with web UI",
    image: "lscr.io/linuxserver/qbittorrent:latest",
    port: 8080,
    configSubdir: "config",
    needsDataDir: true,
    extraPorts: [
      { host: 6881, container: 6881, protocol: "tcp" },
      { host: 6881, container: 6881, protocol: "udp" },
    ],
    environment: { WEBUI_PORT: "8080" },
  },
  {
    name: "prowlarr",
    displayName: "Prowlarr",
    description: "Indexer manager for the *Arr stack",
    image: "lscr.io/linuxserver/prowlarr:latest",
    port: 9696,
    configSubdir: "config",
    needsDataDir: false,
  },
  {
    name: "radarr",
    displayName: "Radarr",
    description: "Movie collection manager",
    image: "lscr.io/linuxserver/radarr:latest",
    port: 7878,
    configSubdir: "config",
    needsDataDir: true,
  },
  {
    name: "sonarr",
    displayName: "Sonarr",
    description: "TV series collection manager",
    image: "lscr.io/linuxserver/sonarr:latest",
    port: 8989,
    configSubdir: "config",
    needsDataDir: true,
  },
  {
    name: "bazarr",
    displayName: "Bazarr",
    description: "Subtitle manager for Sonarr and Radarr",
    image: "lscr.io/linuxserver/bazarr:latest",
    port: 6767,
    configSubdir: "config",
    needsDataDir: true,
  },
  {
    name: "lidarr",
    displayName: "Lidarr",
    description: "Music collection manager",
    image: "lscr.io/linuxserver/lidarr:latest",
    port: 8686,
    configSubdir: "config",
    needsDataDir: true,
  },
  {
    name: "seerr",
    displayName: "Seerr",
    description: "Media request manager for Jellyfin (recommended, successor to Jellyseerr)",
    image: "ghcr.io/seerr-team/seerr:latest",
    port: 5055,
    configSubdir: "app/config",
    needsDataDir: false,
    init: true,
    environment: {
      LOG_LEVEL: "debug",
      PORT: "5055",
    },
    healthcheck: {
      test:
        "wget --no-verbose --tries=1 --spider http://localhost:5055/api/v1/status || exit 1",
      startPeriod: "20s",
      timeout: "3s",
      interval: "15s",
      retries: 3,
    },
  },
  {
    name: "homarr",
    displayName: "Homarr",
    description: "Customizable dashboard for your server",
    image: "ghcr.io/ajnart/homarr:latest",
    port: 7575,
    configSubdir: "multiple",
    multipleConfigDirs: ["configs", "icons", "data"],
    needsDataDir: false,
    mountDockerSocket: true,
  },
  {
    name: "jellyfin",
    displayName: "Jellyfin",
    description: "Free media streaming server",
    image: "lscr.io/linuxserver/jellyfin:latest",
    port: 8096,
    configSubdir: "config",
    needsDataDir: true,
    dataDirReadOnly: true,
    extraPorts: [
      { host: 8920, container: 8920, protocol: "tcp" },
      { host: 7359, container: 7359, protocol: "udp" },
    ],
  },
  {
    name: "navidrome",
    displayName: "Navidrome",
    description: "Modern music server and streamer",
    image: "deluan/navidrome:latest",
    port: 4533,
    configSubdir: "data",
    needsDataDir: false,
    mountMusicDir: true,
    environment: {
      ND_LOGLEVEL: "debug",
    },
    secrets: [
      {
        envVar: "ND_SPOTIFY_ID",
        prompt: "Spotify Client ID (for artist images)",
      },
      {
        envVar: "ND_SPOTIFY_SECRET",
        prompt: "Spotify Client Secret",
        sensitive: true,
      },
    ],
  },
  {
    name: "duckdns",
    displayName: "DuckDNS",
    description: "Free dynamic DNS service",
    image: "lscr.io/linuxserver/duckdns:latest",
    port: null,
    configSubdir: "config",
    networkMode: "host",
    needsDataDir: false,
    environment: {
      UPDATE_IP: "ipv4",
      LOG_FILE: "false",
    },
    secrets: [
      {
        envVar: "DUCKDNS_SUBDOMAINS",
        prompt: "DuckDNS subdomain(s) (comma-separated)",
      },
      {
        envVar: "DUCKDNS_TOKEN",
        prompt: "DuckDNS token",
        sensitive: true,
      },
    ],
  },
  {
    name: "wireguard",
    displayName: "WireGuard",
    description: "Fast, modern VPN tunnel",
    image: "lscr.io/linuxserver/wireguard:latest",
    port: null,
    configSubdir: "config",
    needsDataDir: false,
    capAdd: ["NET_ADMIN", "SYS_MODULE"],
    sysctls: { "net.ipv4.conf.all.src_valid_mark": "1" },
    extraPorts: [{ host: 51820, container: 51820, protocol: "udp" }],
    extraVolumes: [
      { host: "lib/modules", container: "/lib/modules", options: "ro" },
    ],
    environment: {
      SERVERPORT: "51820",
      PEERDNS: "auto",
      INTERNAL_SUBNET: "10.13.13.0",
      LOG_CONFS: "true",
    },
    secrets: [
      { envVar: "WG_SERVERURL", prompt: "WireGuard server URL or public IP" },
      { envVar: "WG_PEERS", prompt: "Number of VPN client peers" },
    ],
  },
  {
    name: "uptime-kuma",
    displayName: "Uptime Kuma",
    description: "Self-hosted monitoring tool",
    image: "louislam/uptime-kuma:2",
    containerName: "uptime-kuma",
    port: 3001,
    configSubdir: "data",
    needsDataDir: false,
    mountDockerSocket: true,
    restartPolicy: "always",
  },
];

/** Get an app definition by name */
export function getApp(name: string): AppDefinition | undefined {
  return APP_REGISTRY.find((app) => app.name === name);
}

/** Get all valid app names */
export function getAppNames(): string[] {
  return APP_REGISTRY.map((app) => app.name);
}

/** Get the container name for an app */
export function getContainerName(app: AppDefinition): string {
  return app.containerName ?? app.name;
}

/** Get the app directory path */
export function getAppDir(app: AppDefinition, baseDir: string): string {
  return `${baseDir}/${app.name}`;
}

/** Get config directory path(s) for backup/restore */
export function getConfigPaths(
  app: AppDefinition,
  baseDir: string,
): string[] {
  const appDir = getAppDir(app, baseDir);
  if (app.configSubdir === "multiple" && app.multipleConfigDirs) {
    return app.multipleConfigDirs.map((dir) => `${appDir}/${dir}`);
  }
  return [`${appDir}/${app.configSubdir}`];
}

/** Get the compose file path for an app */
export function getComposePath(app: AppDefinition, baseDir: string): string {
  return `${getAppDir(app, baseDir)}/docker-compose.yml`;
}

/**
 * Filter out apps that conflict with already-selected apps.
 * Earlier entries in the selection win (first-selected takes priority).
 */
export function filterConflicts(apps: AppDefinition[]): AppDefinition[] {
  const selected = new Set<string>();
  const excluded = new Set<string>();
  const result: AppDefinition[] = [];

  for (const app of apps) {
    if (excluded.has(app.name)) continue;
    selected.add(app.name);
    result.push(app);
    if (app.conflictsWith) {
      for (const c of app.conflictsWith) {
        if (!selected.has(c)) excluded.add(c);
      }
    }
  }

  return result;
}
