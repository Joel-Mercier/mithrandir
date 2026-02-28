import type { AppDefinition, EnvConfig } from "@/types.js";

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
        required: true,
      },
      {
        envVar: "DUCKDNS_TOKEN",
        prompt: "DuckDNS token",
        sensitive: true,
        required: true,
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
      { envVar: "WG_SERVERURL", prompt: "WireGuard server URL or public IP", required: true },
      { envVar: "WG_PEERS", prompt: "Number of VPN client peers" },
    ],
  },
  {
    name: "gatus",
    displayName: "Gatus",
    description: "Automated service health monitoring",
    image: "twinproduction/gatus:latest",
    port: 3001,
    configSubdir: "multiple",
    multipleConfigDirs: ["config", "data"],
    needsDataDir: false,
  },
  {
    name: "immich",
    displayName: "Immich",
    description: "Self-hosted photo and video management",
    image: "ghcr.io/immich-app/immich-server:release",
    containerName: "immich_server",
    additionalContainers: ["immich_machine_learning", "immich_redis", "immich_postgres"],
    port: 2283,
    configSubdir: "postgres",
    needsDataDir: false,
    rawCompose: (envConfig: EnvConfig) => {
      const baseDir = envConfig.BASE_DIR;
      const dbPassword = envConfig.IMMICH_DB_PASSWORD ?? "postgres";
      const lines = [
        `services:`,
        `  immich_server:`,
        `    image: ghcr.io/immich-app/immich-server:release`,
        `    container_name: immich_server`,
        `    environment:`,
        `      - DB_PASSWORD=${dbPassword}`,
        `      - DB_USERNAME=postgres`,
        `      - DB_DATABASE_NAME=immich`,
        `      - DB_HOSTNAME=immich_postgres`,
        `      - REDIS_HOSTNAME=immich_redis`,
        `      - TZ=${envConfig.TZ}`,
        `    ports:`,
        `      - 2283:2283`,
        `    volumes:`,
        `      - ${baseDir}/data/media/pictures:/data`,
        `      - /etc/localtime:/etc/localtime:ro`,
        `    depends_on:`,
        `      - immich_redis`,
        `      - immich_postgres`,
        `    restart: unless-stopped`,
        `    healthcheck:`,
        `      disable: false`,
        ``,
        `  immich_machine_learning:`,
        `    image: ghcr.io/immich-app/immich-machine-learning:release`,
        `    container_name: immich_machine_learning`,
        `    volumes:`,
        `      - immich-model-cache:/cache`,
        `    environment:`,
        `      - DB_PASSWORD=${dbPassword}`,
        `      - DB_USERNAME=postgres`,
        `      - DB_DATABASE_NAME=immich`,
        `      - DB_HOSTNAME=immich_postgres`,
        `      - REDIS_HOSTNAME=immich_redis`,
        `    restart: unless-stopped`,
        `    healthcheck:`,
        `      disable: false`,
        ``,
        `  immich_redis:`,
        `    image: docker.io/valkey/valkey:9`,
        `    container_name: immich_redis`,
        `    healthcheck:`,
        `      test: redis-cli ping || exit 1`,
        `    restart: unless-stopped`,
        ``,
        `  immich_postgres:`,
        `    image: ghcr.io/immich-app/postgres:14-vectorchord0.4.3-pgvectors0.2.0`,
        `    container_name: immich_postgres`,
        `    environment:`,
        `      - POSTGRES_PASSWORD=${dbPassword}`,
        `      - POSTGRES_USER=postgres`,
        `      - POSTGRES_DB=immich`,
        `      - POSTGRES_INITDB_ARGS=--data-checksums`,
        `    volumes:`,
        `      - ${baseDir}/immich/postgres:/var/lib/postgresql/data`,
        `    shm_size: 128mb`,
        `    restart: unless-stopped`,
        `    healthcheck:`,
        `      disable: false`,
        ``,
        `volumes:`,
        `  immich-model-cache:`,
      ];
      return lines.join("\n") + "\n";
    },
    secrets: [
      {
        envVar: "IMMICH_DB_PASSWORD",
        prompt: "Immich database password",
        sensitive: true,
      },
    ],
  },
  {
    name: "excalidraw",
    displayName: "Excalidraw",
    description: "Virtual whiteboard for sketching",
    image: "excalidraw/excalidraw:latest",
    port: 5000,
    containerPort: 80,
    configSubdir: "config",
    needsDataDir: false,
  },
  {
    name: "openwebui",
    displayName: "Open WebUI",
    description: "Self-hosted AI chat interface",
    image: "ghcr.io/open-webui/open-webui:main",
    port: 3000,
    containerPort: 8080,
    configSubdir: "data",
    needsDataDir: false,
  },
  {
    name: "flaresolverr",
    displayName: "FlareSolverr",
    description: "Proxy server to bypass Cloudflare for Prowlarr",
    image: "ghcr.io/flaresolverr/flaresolverr:latest",
    port: 8191,
    configSubdir: "config",
    needsDataDir: false,
    hidden: true,
    companionOf: "prowlarr",
    environment: {
      LOG_LEVEL: "info",
      LOG_FILE: "none",
      LOG_HTML: "false",
      CAPTCHA_SOLVER: "none",
    },
  },
  {
    name: "caddy",
    displayName: "Caddy",
    description: "HTTPS reverse proxy with automatic certificates",
    image: "mithrandir/caddy-duckdns:latest",
    port: null,
    configSubdir: "config",
    needsDataDir: false,
    hidden: true,
    rawCompose: (envConfig: EnvConfig) => {
      const baseDir = envConfig.BASE_DIR;
      const appDir = `${baseDir}/caddy`;
      const token = envConfig.DUCKDNS_TOKEN ?? "";
      const acmeEmail = envConfig.ACME_EMAIL ?? "";
      return [
        "services:",
        "  caddy:",
        "    image: mithrandir/caddy-duckdns:latest",
        "    container_name: caddy",
        "    network_mode: host",
        "    environment:",
        `      - DUCKDNS_TOKEN=${token}`,
        `      - ACME_EMAIL=${acmeEmail}`,
        "    volumes:",
        `      - ${appDir}/Caddyfile:/etc/caddy/Caddyfile:ro`,
        `      - ${appDir}/data:/data`,
        `      - ${appDir}/config:/config`,
        "    restart: unless-stopped",
        "",
      ].join("\n") + "\n";
    },
  },
  {
    name: "pihole",
    displayName: "Pi-hole",
    description: "Network-wide ad blocker and DNS server",
    image: "pihole/pihole:latest",
    port: 80,
    configSubdir: "etc-pihole",
    needsDataDir: false,
    capAdd: ["NET_ADMIN", "SYS_TIME", "SYS_NICE"],
    extraPorts: [
      { host: 53, container: 53, protocol: "tcp" },
      { host: 53, container: 53, protocol: "udp" },
      { host: 443, container: 443, protocol: "tcp" },
    ],
    environment: {
      FTLCONF_dns_listeningMode: "ALL",
    },
    secrets: [
      {
        envVar: "PIHOLE_PASSWORD",
        prompt: "Pi-hole web interface password",
        sensitive: true,
      },
    ],
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

/** Get all container names for an app (primary + additional for multi-container apps) */
export function getAllContainerNames(app: AppDefinition): string[] {
  const primary = getContainerName(app);
  return app.additionalContainers
    ? [primary, ...app.additionalContainers]
    : [primary];
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

/** Get all companion apps for a given parent app */
export function getCompanionApps(parentName: string): AppDefinition[] {
  return APP_REGISTRY.filter((app) => app.companionOf === parentName);
}
