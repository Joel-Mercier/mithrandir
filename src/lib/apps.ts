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
      LOG_LEVEL: "info",
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
      ND_LOGLEVEL: "info",
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
    name: "omnitools",
    displayName: "Omni Tools",
    description: "Collection of useful productivity tools",
    image: "iib0011/omni-tools:latest",
    port: 8079,
    containerPort: 80,
    configSubdir: "config",
    needsDataDir: false,
  },
  {
    name: "vaultwarden",
    displayName: "Vaultwarden",
    description: "Lightweight Bitwarden-compatible password manager",
    image: "vaultwarden/server:latest",
    port: 8222,
    containerPort: 80,
    configSubdir: "data",
    needsDataDir: false,
    requiresHttps: true,
    environment: {
      SIGNUPS_ALLOWED: "true",
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
        `      - ${appDir}/srv:/srv:ro`,
        `      - ${appDir}/data:/data`,
        `      - ${appDir}/config:/config`,
        "    restart: unless-stopped",
        "",
      ].join("\n") + "\n";
    },
  },
  {
    name: "actualbudget",
    displayName: "Actual Budget",
    description: "Privacy-focused personal finance and budgeting app",
    image: "docker.io/actualbudget/actual-server:latest",
    port: 5006,
    configSubdir: "data",
    needsDataDir: false,
    healthcheck: {
      test: "node src/scripts/health-check.js",
      startPeriod: "20s",
      timeout: "10s",
      interval: "60s",
      retries: 3,
    },
  },
  {
    name: "sure",
    displayName: "Sure",
    description: "Privacy-focused personal finance tracker",
    image: "ghcr.io/we-promise/sure:stable",
    containerName: "sure_web",
    additionalContainers: ["sure_worker", "sure_redis", "sure_postgres"],
    port: 3005,
    configSubdir: "postgres",
    needsDataDir: false,
    rawCompose: (envConfig: EnvConfig) => {
      const baseDir = envConfig.BASE_DIR;
      const dbPassword = envConfig.SURE_DB_PASSWORD ?? "sure_password";
      const secretKeyBase = envConfig.SURE_SECRET_KEY_BASE ?? "change-me";
      const assumeSsl = envConfig.ENABLE_HTTPS === "true" ? "true" : "false";
      const openaiEnv: string[] = [];
      if (envConfig.SURE_OPENAI_ACCESS_TOKEN) {
        openaiEnv.push(`      - OPENAI_ACCESS_TOKEN=${envConfig.SURE_OPENAI_ACCESS_TOKEN}`);
      }
      if (envConfig.SURE_OPENAI_URI_BASE) {
        openaiEnv.push(`      - OPENAI_URI_BASE=${envConfig.SURE_OPENAI_URI_BASE}`);
      }
      if (envConfig.SURE_OPENAI_MODEL) {
        openaiEnv.push(`      - OPENAI_MODEL=${envConfig.SURE_OPENAI_MODEL}`);
      }
      const lines = [
        `services:`,
        `  sure_web:`,
        `    image: ghcr.io/we-promise/sure:stable`,
        `    container_name: sure_web`,
        `    environment:`,
        `      - SELF_HOSTED=true`,
        `      - SECRET_KEY_BASE=${secretKeyBase}`,
        `      - RAILS_FORCE_SSL=false`,
        `      - RAILS_ASSUME_SSL=${assumeSsl}`,
        `      - POSTGRES_USER=sure_user`,
        `      - POSTGRES_PASSWORD=${dbPassword}`,
        `      - POSTGRES_DB=sure_production`,
        `      - DB_HOST=sure_postgres`,
        `      - DB_PORT=5432`,
        `      - REDIS_URL=redis://sure_redis:6379/1`,
        `      - TZ=${envConfig.TZ}`,
        ...openaiEnv,
        `    volumes:`,
        `      - sure-storage:/rails/storage`,
        `    ports:`,
        `      - 3005:3000`,
        `    depends_on:`,
        `      sure_postgres:`,
        `        condition: service_healthy`,
        `      sure_redis:`,
        `        condition: service_healthy`,
        `    dns:`,
        `      - 8.8.8.8`,
        `      - 1.1.1.1`,
        `    restart: unless-stopped`,
        ``,
        `  sure_worker:`,
        `    image: ghcr.io/we-promise/sure:stable`,
        `    container_name: sure_worker`,
        `    command: bundle exec sidekiq`,
        `    environment:`,
        `      - SELF_HOSTED=true`,
        `      - SECRET_KEY_BASE=${secretKeyBase}`,
        `      - RAILS_FORCE_SSL=false`,
        `      - RAILS_ASSUME_SSL=${assumeSsl}`,
        `      - POSTGRES_USER=sure_user`,
        `      - POSTGRES_PASSWORD=${dbPassword}`,
        `      - POSTGRES_DB=sure_production`,
        `      - DB_HOST=sure_postgres`,
        `      - DB_PORT=5432`,
        `      - REDIS_URL=redis://sure_redis:6379/1`,
        `      - TZ=${envConfig.TZ}`,
        ...openaiEnv,
        `    volumes:`,
        `      - sure-storage:/rails/storage`,
        `    depends_on:`,
        `      sure_postgres:`,
        `        condition: service_healthy`,
        `      sure_redis:`,
        `        condition: service_healthy`,
        `    dns:`,
        `      - 8.8.8.8`,
        `      - 1.1.1.1`,
        `    restart: unless-stopped`,
        ``,
        `  sure_redis:`,
        `    image: redis:latest`,
        `    container_name: sure_redis`,
        `    volumes:`,
        `      - sure-redis-data:/data`,
        `    healthcheck:`,
        `      test: ["CMD", "redis-cli", "ping"]`,
        `      interval: 5s`,
        `      timeout: 5s`,
        `      retries: 5`,
        `    restart: unless-stopped`,
        ``,
        `  sure_postgres:`,
        `    image: postgres:16`,
        `    container_name: sure_postgres`,
        `    environment:`,
        `      - POSTGRES_USER=sure_user`,
        `      - POSTGRES_PASSWORD=${dbPassword}`,
        `      - POSTGRES_DB=sure_production`,
        `    volumes:`,
        `      - ${baseDir}/sure/postgres:/var/lib/postgresql/data`,
        `    healthcheck:`,
        `      test: ["CMD-SHELL", "pg_isready -U sure_user -d sure_production"]`,
        `      interval: 5s`,
        `      timeout: 5s`,
        `      retries: 5`,
        `    restart: unless-stopped`,
        ``,
        `volumes:`,
        `  sure-storage:`,
        `  sure-redis-data:`,
      ];
      return lines.join("\n") + "\n";
    },
    secrets: [
      {
        envVar: "SURE_SECRET_KEY_BASE",
        prompt: "Sure secret key base (Rails secret)",
        sensitive: true,
        required: true,
        generate: "openssl rand -hex 64",
      },
      {
        envVar: "SURE_DB_PASSWORD",
        prompt: "Sure database password",
        sensitive: true,
      },
    ],
  },
  {
    name: "affine",
    displayName: "AFFiNE",
    description: "Privacy-focused knowledge base and workspace",
    image: "ghcr.io/toeverything/affine:stable",
    containerName: "affine_server",
    additionalContainers: ["affine_migration_job", "affine_redis", "affine_postgres"],
    port: 3010,
    configSubdir: "config",
    needsDataDir: false,
    rawCompose: (envConfig: EnvConfig) => {
      const baseDir = envConfig.BASE_DIR;
      const dbPassword = envConfig.AFFINE_DB_PASSWORD ?? "affine";
      const dbUsername = envConfig.AFFINE_DB_USERNAME ?? "affine";
      const lines = [
        `services:`,
        `  affine_server:`,
        `    image: ghcr.io/toeverything/affine:stable`,
        `    container_name: affine_server`,
        `    environment:`,
        `      - REDIS_SERVER_HOST=affine_redis`,
        `      - DATABASE_URL=postgresql://${dbUsername}:${dbPassword}@affine_postgres:5432/affine`,
        `      - AFFINE_INDEXER_ENABLED=false`,
        `      - TZ=${envConfig.TZ}`,
        `    ports:`,
        `      - 3010:3010`,
        `    volumes:`,
        `      - ${baseDir}/affine/storage:/root/.affine/storage`,
        `      - ${baseDir}/affine/config:/root/.affine/config`,
        `    depends_on:`,
        `      affine_redis:`,
        `        condition: service_healthy`,
        `      affine_postgres:`,
        `        condition: service_healthy`,
        `      affine_migration_job:`,
        `        condition: service_completed_successfully`,
        `    restart: unless-stopped`,
        ``,
        `  affine_migration_job:`,
        `    image: ghcr.io/toeverything/affine:stable`,
        `    container_name: affine_migration_job`,
        `    command: ['sh', '-c', 'node ./scripts/self-host-predeploy.js']`,
        `    environment:`,
        `      - REDIS_SERVER_HOST=affine_redis`,
        `      - DATABASE_URL=postgresql://${dbUsername}:${dbPassword}@affine_postgres:5432/affine`,
        `      - AFFINE_INDEXER_ENABLED=false`,
        `    volumes:`,
        `      - ${baseDir}/affine/storage:/root/.affine/storage`,
        `      - ${baseDir}/affine/config:/root/.affine/config`,
        `    depends_on:`,
        `      affine_postgres:`,
        `        condition: service_healthy`,
        `      affine_redis:`,
        `        condition: service_healthy`,
        ``,
        `  affine_redis:`,
        `    image: redis:latest`,
        `    container_name: affine_redis`,
        `    healthcheck:`,
        `      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]`,
        `      interval: 10s`,
        `      timeout: 5s`,
        `      retries: 5`,
        `    restart: unless-stopped`,
        ``,
        `  affine_postgres:`,
        `    image: pgvector/pgvector:pg16`,
        `    container_name: affine_postgres`,
        `    environment:`,
        `      - POSTGRES_USER=${dbUsername}`,
        `      - POSTGRES_PASSWORD=${dbPassword}`,
        `      - POSTGRES_DB=affine`,
        `      - POSTGRES_INITDB_ARGS=--data-checksums`,
        `    volumes:`,
        `      - ${baseDir}/affine/postgres:/var/lib/postgresql/data`,
        `    healthcheck:`,
        `      test: ["CMD", "pg_isready", "-U", "${dbUsername}", "-d", "affine"]`,
        `      interval: 10s`,
        `      timeout: 5s`,
        `      retries: 5`,
        `    restart: unless-stopped`,
      ];
      return lines.join("\n") + "\n";
    },
    secrets: [
      {
        envVar: "AFFINE_DB_PASSWORD",
        prompt: "AFFiNE database password",
        sensitive: true,
      },
      {
        envVar: "AFFINE_DB_USERNAME",
        prompt: "AFFiNE database username (default: affine)",
      },
    ],
  },
  {
    name: "n8n",
    displayName: "n8n",
    description: "Workflow automation platform",
    image: "docker.n8n.io/n8nio/n8n:latest",
    port: 5678,
    configSubdir: "data",
    needsDataDir: false,
    environment: {
      N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: "true",
      N8N_PORT: "5678",
      N8N_RUNNERS_ENABLED: "true",
      NODE_ENV: "production",
    },
    extraVolumes: [
      { host: "files", container: "/files" },
    ],
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
    extraVolumes: [
      { host: "etc-dnsmasq.d", container: "/etc/dnsmasq.d" },
    ],
    environment: {
      FTLCONF_dns_listeningMode: "ALL",
      FTLCONF_misc_etc_dnsmasq_d: "true",
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

/** Predefined app stacks for one-command installs */
export interface AppStack {
  label: string;
  value: string;
  description: string;
  apps: string[];
}

export const APP_STACKS: AppStack[] = [
  {
    label: "Media",
    value: "media",
    description: "qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Navidrome, Lidarr, Immich",
    apps: ["qbittorrent", "prowlarr", "radarr", "sonarr", "bazarr", "seerr", "jellyfin", "navidrome", "lidarr", "immich"],
  },
  {
    label: "Media: Movies & TV",
    value: "media-movies-tv",
    description: "qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin",
    apps: ["qbittorrent", "prowlarr", "radarr", "sonarr", "bazarr", "seerr", "jellyfin"],
  },
  {
    label: "Media: Music",
    value: "media-music",
    description: "Navidrome, Lidarr, qBittorrent",
    apps: ["navidrome", "lidarr", "qbittorrent"],
  },
  {
    label: "Media: Pictures",
    value: "media-pictures",
    description: "Immich",
    apps: ["immich"],
  },
  {
    label: "Security",
    value: "security",
    description: "Caddy (HTTPS reverse proxy), Pi-hole (DNS)",
    apps: ["caddy", "pihole"],
  },
];

export function getStackNames(): string[] {
  return APP_STACKS.map((s) => s.value);
}

export function getStack(name: string): AppStack | undefined {
  return APP_STACKS.find((s) => s.value === name);
}

/** Categories for the setup wizard's app picker (broader than stacks) */
export interface AppCategory {
  label: string;
  value: string;
  description: string;
  apps: string[];
}

export const APP_CATEGORIES: AppCategory[] = [
  {
    label: "Media",
    value: "media",
    description: "qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Navidrome, Lidarr, Immich",
    apps: ["qbittorrent", "prowlarr", "radarr", "sonarr", "bazarr", "seerr", "jellyfin", "navidrome", "lidarr", "immich"],
  },
  {
    label: "Automation",
    value: "automation",
    description: "Home Assistant, n8n",
    apps: ["homeassistant", "n8n"],
  },
  {
    label: "Monitoring",
    value: "monitoring",
    description: "Gatus",
    apps: ["gatus"],
  },
  {
    label: "Productivity",
    value: "productivity",
    description: "AFFiNE, Excalidraw, Omni Tools, Open WebUI, Vaultwarden",
    apps: ["affine", "excalidraw", "omnitools", "openwebui", "vaultwarden"],
  },
  {
    label: "Finance",
    value: "finance",
    description: "Actual Budget, Sure",
    apps: ["actualbudget", "sure"],
  },
  {
    label: "Network & Security",
    value: "security",
    description: "Pi-hole, WireGuard, DuckDNS",
    apps: ["pihole", "wireguard", "duckdns"],
  },
  {
    label: "Utilities",
    value: "utilities",
    description: "Homarr",
    apps: ["homarr"],
  },
];
