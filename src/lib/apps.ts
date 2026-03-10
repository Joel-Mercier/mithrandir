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
    capacity: { performance: "medium", storage: "low", note: "Automation engine with integrations and history database" },
  },
  {
    name: "qbittorrent",
    displayName: "qBittorrent",
    description: "BitTorrent client with web UI",
    image: "lscr.io/linuxserver/qbittorrent:latest",
    port: 8080,
    configSubdir: "config",
    needsDataDir: true,
    capacity: { performance: "low", storage: "high", note: "Download client, stores torrents and media files" },
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
    capacity: { performance: "low", storage: "low", note: "Indexer proxy, minimal resources" },
  },
  {
    name: "radarr",
    displayName: "Radarr",
    description: "Movie collection manager",
    image: "lscr.io/linuxserver/radarr:latest",
    port: 7878,
    configSubdir: "config",
    needsDataDir: true,
    capacity: { performance: "low", storage: "medium", note: "Movie database and monitoring" },
  },
  {
    name: "sonarr",
    displayName: "Sonarr",
    description: "TV series collection manager",
    image: "lscr.io/linuxserver/sonarr:latest",
    port: 8989,
    configSubdir: "config",
    needsDataDir: true,
    capacity: { performance: "low", storage: "medium", note: "TV database and monitoring" },
  },
  {
    name: "bazarr",
    displayName: "Bazarr",
    description: "Subtitle manager for Sonarr and Radarr",
    image: "lscr.io/linuxserver/bazarr:latest",
    port: 6767,
    configSubdir: "config",
    needsDataDir: true,
    capacity: { performance: "low", storage: "low", note: "Subtitle fetching, minimal resources" },
  },
  {
    name: "lidarr",
    displayName: "Lidarr",
    description: "Music collection manager",
    image: "lscr.io/linuxserver/lidarr:latest",
    port: 8686,
    configSubdir: "config",
    needsDataDir: true,
    capacity: { performance: "low", storage: "medium", note: "Music database and monitoring" },
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
    capacity: { performance: "low", storage: "low", note: "Request management UI" },
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
    capacity: { performance: "low", storage: "low", note: "Dashboard, mostly static content" },
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
    capacity: { performance: "high", storage: "high", note: "Media transcoding and large media libraries" },
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
    capacity: { performance: "low", storage: "low", note: "Music streaming, reads existing files" },
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
    capacity: { performance: "low", storage: "low", note: "DNS updater, background service" },
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
    capacity: { performance: "low", storage: "low", note: "VPN tunnel, kernel module" },
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
    capacity: { performance: "low", storage: "low", note: "Health monitoring, tiny footprint" },
  },
  {
    name: "immich",
    displayName: "Immich",
    description: "Self-hosted photo and video management",
    image: "ghcr.io/immich-app/immich-server:release",
    containerName: "immich_server",
    capacity: { performance: "high", storage: "high", note: "ML processing for face detection and search, stores all photos and videos" },
    additionalContainers: ["immich_machine_learning", "immich_redis", "immich_postgres"],
    port: 2283,
    configSubdir: "postgres",
    needsDataDir: false,
    rawCompose: (envConfig: EnvConfig) => {
      const baseDir = envConfig.BASE_DIR;
      const dbPassword = envConfig.IMMICH_DB_PASSWORD ?? "postgres";
      const lines = [
        `services:`,
        `  immich-server:`,
        `    image: ghcr.io/immich-app/immich-server:release`,
        `    container_name: immich_server`,
        `    environment:`,
        `      - DB_PASSWORD=${dbPassword}`,
        `      - DB_USERNAME=postgres`,
        `      - DB_DATABASE_NAME=immich`,
        `      - DB_HOSTNAME=immich-postgres`,
        `      - REDIS_HOSTNAME=immich-redis`,
        `      - TZ=${envConfig.TZ}`,
        `    ports:`,
        `      - 2283:2283`,
        `    volumes:`,
        `      - ${baseDir}/data/media/pictures:/data`,
        `      - /etc/localtime:/etc/localtime:ro`,
        `    depends_on:`,
        `      - immich-redis`,
        `      - immich-postgres`,
        `    restart: unless-stopped`,
        `    healthcheck:`,
        `      disable: false`,
        ``,
        `  immich-machine-learning:`,
        `    image: ghcr.io/immich-app/immich-machine-learning:release`,
        `    container_name: immich_machine_learning`,
        `    volumes:`,
        `      - immich-model-cache:/cache`,
        `    environment:`,
        `      - DB_PASSWORD=${dbPassword}`,
        `      - DB_USERNAME=postgres`,
        `      - DB_DATABASE_NAME=immich`,
        `      - DB_HOSTNAME=immich-postgres`,
        `      - REDIS_HOSTNAME=immich-redis`,
        `    restart: unless-stopped`,
        `    healthcheck:`,
        `      disable: false`,
        ``,
        `  immich-redis:`,
        `    image: docker.io/valkey/valkey:9`,
        `    container_name: immich_redis`,
        `    healthcheck:`,
        `      test: redis-cli ping || exit 1`,
        `    restart: unless-stopped`,
        ``,
        `  immich-postgres:`,
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
    capacity: { performance: "low", storage: "low", note: "Client-side whiteboard, minimal server resources" },
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
    capacity: { performance: "high", storage: "medium", note: "AI chat interface, model inference" },
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
    capacity: { performance: "medium", storage: "low", note: "Headless browser for CAPTCHA solving" },
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
    capacity: { performance: "low", storage: "low", note: "Static tool collection" },
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
    capacity: { performance: "low", storage: "low", note: "Password vault, minimal storage" },
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
    capacity: { performance: "low", storage: "low", note: "Reverse proxy, minimal resources" },
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
    capacity: { performance: "low", storage: "low", note: "Personal finance, small database" },
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
    capacity: { performance: "medium", storage: "low", note: "Rails + Sidekiq workers" },
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
        `  sure-web:`,
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
        `      - DB_HOST=sure-postgres`,
        `      - DB_PORT=5432`,
        `      - REDIS_URL=redis://sure-redis:6379/1`,
        `      - TZ=${envConfig.TZ}`,
        ...openaiEnv,
        `    volumes:`,
        `      - sure-storage:/rails/storage`,
        `    ports:`,
        `      - 3005:3000`,
        `    depends_on:`,
        `      sure-postgres:`,
        `        condition: service_healthy`,
        `      sure-redis:`,
        `        condition: service_healthy`,
        `    dns:`,
        `      - 8.8.8.8`,
        `      - 1.1.1.1`,
        `    restart: unless-stopped`,
        ``,
        `  sure-worker:`,
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
        `      - DB_HOST=sure-postgres`,
        `      - DB_PORT=5432`,
        `      - REDIS_URL=redis://sure-redis:6379/1`,
        `      - TZ=${envConfig.TZ}`,
        ...openaiEnv,
        `    volumes:`,
        `      - sure-storage:/rails/storage`,
        `    depends_on:`,
        `      sure-postgres:`,
        `        condition: service_healthy`,
        `      sure-redis:`,
        `        condition: service_healthy`,
        `    dns:`,
        `      - 8.8.8.8`,
        `      - 1.1.1.1`,
        `    restart: unless-stopped`,
        ``,
        `  sure-redis:`,
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
        `  sure-postgres:`,
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
    capacity: { performance: "medium", storage: "medium", note: "Knowledge base with PostgreSQL" },
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
        `  affine-server:`,
        `    image: ghcr.io/toeverything/affine:stable`,
        `    container_name: affine_server`,
        `    environment:`,
        `      - REDIS_SERVER_HOST=affine-redis`,
        `      - DATABASE_URL=postgresql://${dbUsername}:${dbPassword}@affine-postgres:5432/affine`,
        `      - AFFINE_INDEXER_ENABLED=false`,
        `      - TZ=${envConfig.TZ}`,
        `    ports:`,
        `      - 3010:3010`,
        `    volumes:`,
        `      - ${baseDir}/affine/storage:/root/.affine/storage`,
        `      - ${baseDir}/affine/config:/root/.affine/config`,
        `    depends_on:`,
        `      affine-redis:`,
        `        condition: service_healthy`,
        `      affine-postgres:`,
        `        condition: service_healthy`,
        `      affine-migration-job:`,
        `        condition: service_completed_successfully`,
        `    restart: unless-stopped`,
        ``,
        `  affine-migration-job:`,
        `    image: ghcr.io/toeverything/affine:stable`,
        `    container_name: affine_migration_job`,
        `    command: ['sh', '-c', 'node ./scripts/self-host-predeploy.js']`,
        `    environment:`,
        `      - REDIS_SERVER_HOST=affine-redis`,
        `      - DATABASE_URL=postgresql://${dbUsername}:${dbPassword}@affine-postgres:5432/affine`,
        `      - AFFINE_INDEXER_ENABLED=false`,
        `    volumes:`,
        `      - ${baseDir}/affine/storage:/root/.affine/storage`,
        `      - ${baseDir}/affine/config:/root/.affine/config`,
        `    depends_on:`,
        `      affine-postgres:`,
        `        condition: service_healthy`,
        `      affine-redis:`,
        `        condition: service_healthy`,
        ``,
        `  affine-redis:`,
        `    image: redis:latest`,
        `    container_name: affine_redis`,
        `    healthcheck:`,
        `      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]`,
        `      interval: 10s`,
        `      timeout: 5s`,
        `      retries: 5`,
        `    restart: unless-stopped`,
        ``,
        `  affine-postgres:`,
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
    capacity: { performance: "medium", storage: "low", note: "Workflow automation engine" },
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
    name: "penpot",
    displayName: "Penpot",
    description: "Open-source design and prototyping platform",
    image: "penpotapp/frontend:latest",
    containerName: "penpot_frontend",
    capacity: { performance: "medium", storage: "medium", note: "Design platform with multiple services" },
    additionalContainers: ["penpot_backend", "penpot_exporter", "penpot_postgres", "penpot_valkey", "penpot_mailcatch"],
    port: 9001,
    configSubdir: "postgres",
    needsDataDir: false,
    rawCompose: (envConfig: EnvConfig) => {
      const baseDir = envConfig.BASE_DIR;
      const dbPassword = envConfig.PENPOT_DB_PASSWORD ?? "penpot";
      const secretKey = envConfig.PENPOT_SECRET_KEY ?? "change-this-insecure-key";
      const duckdnsPrimary = envConfig.DUCKDNS_SUBDOMAINS?.split(",")[0].trim();
      const publicUri = envConfig.ENABLE_HTTPS === "true" && duckdnsPrimary
        ? `https://penpot.${duckdnsPrimary}.duckdns.org`
        : (envConfig.PENPOT_PUBLIC_URI ?? "http://localhost:9001");
      const flags = "disable-email-verification enable-smtp enable-prepl-server disable-secure-session-cookies";
      // Service names use hyphens to match the hostnames the Penpot frontend
      // nginx config expects (penpot-backend, penpot-exporter, etc.)
      const lines = [
        `services:`,
        `  penpot-frontend:`,
        `    image: penpotapp/frontend:latest`,
        `    container_name: penpot_frontend`,
        `    environment:`,
        `      - PENPOT_FLAGS=${flags}`,
        `      - PENPOT_HTTP_SERVER_MAX_BODY_SIZE=31457280`,
        `      - PENPOT_HTTP_SERVER_MAX_MULTIPART_BODY_SIZE=367001600`,
        `    ports:`,
        `      - 9001:8080`,
        `    volumes:`,
        `      - penpot-assets:/opt/data/assets`,
        `    depends_on:`,
        `      - penpot-backend`,
        `      - penpot-exporter`,
        `    restart: unless-stopped`,
        ``,
        `  penpot-backend:`,
        `    image: penpotapp/backend:latest`,
        `    container_name: penpot_backend`,
        `    environment:`,
        `      - PENPOT_FLAGS=${flags}`,
        `      - PENPOT_PUBLIC_URI=${publicUri}`,
        `      - PENPOT_HTTP_SERVER_MAX_BODY_SIZE=31457280`,
        `      - PENPOT_HTTP_SERVER_MAX_MULTIPART_BODY_SIZE=367001600`,
        `      - PENPOT_SECRET_KEY=${secretKey}`,
        `      - PENPOT_DATABASE_URI=postgresql://penpot-postgres/penpot`,
        `      - PENPOT_DATABASE_USERNAME=penpot`,
        `      - PENPOT_DATABASE_PASSWORD=${dbPassword}`,
        `      - PENPOT_REDIS_URI=redis://penpot-valkey/0`,
        `      - PENPOT_OBJECTS_STORAGE_BACKEND=fs`,
        `      - PENPOT_OBJECTS_STORAGE_FS_DIRECTORY=/opt/data/assets`,
        `      - PENPOT_TELEMETRY_ENABLED=true`,
        `      - PENPOT_SMTP_DEFAULT_FROM=no-reply@example.com`,
        `      - PENPOT_SMTP_DEFAULT_REPLY_TO=no-reply@example.com`,
        `      - PENPOT_SMTP_HOST=penpot-mailcatch`,
        `      - PENPOT_SMTP_PORT=1025`,
        `      - PENPOT_SMTP_TLS=false`,
        `      - PENPOT_SMTP_SSL=false`,
        `    volumes:`,
        `      - penpot-assets:/opt/data/assets`,
        `    depends_on:`,
        `      penpot-postgres:`,
        `        condition: service_healthy`,
        `      penpot-valkey:`,
        `        condition: service_healthy`,
        `    restart: unless-stopped`,
        ``,
        `  penpot-exporter:`,
        `    image: penpotapp/exporter:latest`,
        `    container_name: penpot_exporter`,
        `    environment:`,
        `      - PENPOT_SECRET_KEY=${secretKey}`,
        `      - PENPOT_PUBLIC_URI=http://penpot-frontend:8080`,
        `      - PENPOT_REDIS_URI=redis://penpot-valkey/0`,
        `    depends_on:`,
        `      penpot-valkey:`,
        `        condition: service_healthy`,
        `    restart: unless-stopped`,
        ``,
        `  penpot-postgres:`,
        `    image: postgres:15`,
        `    container_name: penpot_postgres`,
        `    stop_signal: SIGINT`,
        `    environment:`,
        `      - POSTGRES_INITDB_ARGS=--data-checksums`,
        `      - POSTGRES_DB=penpot`,
        `      - POSTGRES_USER=penpot`,
        `      - POSTGRES_PASSWORD=${dbPassword}`,
        `    volumes:`,
        `      - ${baseDir}/penpot/postgres:/var/lib/postgresql/data`,
        `    healthcheck:`,
        `      test: ["CMD-SHELL", "pg_isready -U penpot"]`,
        `      interval: 2s`,
        `      timeout: 10s`,
        `      retries: 5`,
        `    restart: unless-stopped`,
        ``,
        `  penpot-valkey:`,
        `    image: valkey/valkey:8.1`,
        `    container_name: penpot_valkey`,
        `    healthcheck:`,
        `      test: ["CMD-SHELL", "valkey-cli ping | grep PONG"]`,
        `      interval: 1s`,
        `      timeout: 3s`,
        `      retries: 5`,
        `    restart: unless-stopped`,
        ``,
        `  penpot-mailcatch:`,
        `    image: sj26/mailcatcher:latest`,
        `    container_name: penpot_mailcatch`,
        `    expose:`,
        `      - '1025'`,
        `    ports:`,
        `      - 1080:1080`,
        `    restart: unless-stopped`,
        ``,
        `volumes:`,
        `  penpot-assets:`,
      ];
      return lines.join("\n") + "\n";
    },
    secrets: [
      {
        envVar: "PENPOT_SECRET_KEY",
        prompt: "Penpot secret key",
        sensitive: true,
        required: true,
        generate: "openssl rand -hex 32",
      },
      {
        envVar: "PENPOT_DB_PASSWORD",
        prompt: "Penpot database password",
        sensitive: true,
      },
      {
        envVar: "PENPOT_PUBLIC_URI",
        prompt: "Penpot public URI (e.g. http://your-server:9001)",
      },
    ],
  },
  {
    name: "stirlingpdf",
    displayName: "Stirling PDF",
    description: "All-in-one PDF manipulation tool",
    image: "stirlingtools/stirling-pdf:latest",
    port: 8084,
    containerPort: 8080,
    configSubdir: "configs",
    needsDataDir: false,
    capacity: { performance: "medium", storage: "low", note: "PDF processing on demand" },
    extraVolumes: [
      { host: "tessdata", container: "/usr/share/tessdata" },
      { host: "logs", container: "/logs" },
      { host: "pipeline", container: "/pipeline" },
    ],
  },
  {
    name: "profilarr",
    displayName: "Profilarr",
    description: "Import, sync, and manage quality profiles for Radarr and Sonarr",
    image: "santiagosayshey/profilarr:latest",
    port: 6868,
    configSubdir: "config",
    needsDataDir: false,
    capacity: { performance: "low", storage: "low", note: "Profile sync utility" },
  },
  {
    name: "trip",
    displayName: "TRIP",
    description: "Travel planning and trip journal",
    image: "ghcr.io/itskovacs/trip:1",
    port: 8085,
    containerPort: 8000,
    configSubdir: "storage",
    needsDataDir: false,
    capacity: { performance: "low", storage: "low", note: "Travel journal, small database" },
    command: ["fastapi", "run", "/app/trip/main.py", "--host", "0.0.0.0"],
  },
  {
    name: "adventurelog",
    displayName: "AdventureLog",
    description: "Travel planning and adventure journal",
    image: "ghcr.io/seanmorley15/adventurelog-frontend:latest",
    containerName: "adventurelog_frontend",
    capacity: { performance: "medium", storage: "medium", note: "Django backend with PostGIS database" },
    additionalContainers: ["adventurelog_backend", "adventurelog_db"],
    port: 8015,
    caddyExtraSubdomains: [{ subdomain: "adventurelog-api", port: 8016 }],
    configSubdir: "postgres",
    needsDataDir: false,
    rawCompose: (envConfig: EnvConfig) => {
      const baseDir = envConfig.BASE_DIR;
      const dbPassword = envConfig.ADVENTURELOG_DB_PASSWORD ?? "changeme123";
      const secretKey = envConfig.ADVENTURELOG_SECRET_KEY ?? "changeme123";
      const adminUsername = envConfig.ADVENTURELOG_ADMIN_USERNAME ?? "admin";
      const adminPassword = envConfig.ADVENTURELOG_ADMIN_PASSWORD ?? "admin";
      const adminEmail = envConfig.ADVENTURELOG_ADMIN_EMAIL ?? "admin@example.com";
      const localIp = envConfig.LOCAL_IP ?? "localhost";
      const duckdnsPrimary = envConfig.DUCKDNS_SUBDOMAINS?.split(",")[0].trim();
      const frontendPort = "8015";
      const backendPort = "8016";
      let publicUrl: string;
      let frontendUrl: string;
      let csrfOrigins: string;
      let origin: string;
      if (envConfig.ENABLE_HTTPS === "true" && duckdnsPrimary) {
        publicUrl = `https://adventurelog-api.${duckdnsPrimary}.duckdns.org`;
        frontendUrl = `https://adventurelog.${duckdnsPrimary}.duckdns.org`;
        csrfOrigins = `${publicUrl},${frontendUrl}`;
        origin = frontendUrl;
      } else {
        publicUrl = `http://${localIp}:${backendPort}`;
        frontendUrl = `http://${localIp}:${frontendPort}`;
        csrfOrigins = `http://${localIp}:${backendPort},http://${localIp}:${frontendPort}`;
        origin = frontendUrl;
      }
      const lines = [
        `services:`,
        `  adventurelog-frontend:`,
        `    image: ghcr.io/seanmorley15/adventurelog-frontend:latest`,
        `    container_name: adventurelog_frontend`,
        `    environment:`,
        `      - PUBLIC_SERVER_URL=http://adventurelog-backend:8000`,
        `      - ORIGIN=${origin}`,
        `      - BODY_SIZE_LIMIT=Infinity`,
        `    ports:`,
        `      - ${frontendPort}:3000`,
        `    depends_on:`,
        `      - adventurelog-backend`,
        `    restart: unless-stopped`,
        ``,
        `  adventurelog-backend:`,
        `    image: ghcr.io/seanmorley15/adventurelog-backend:latest`,
        `    container_name: adventurelog_backend`,
        `    environment:`,
        `      - PGHOST=adventurelog-db`,
        `      - POSTGRES_DB=adventurelog`,
        `      - POSTGRES_USER=adventurelog`,
        `      - POSTGRES_PASSWORD=${dbPassword}`,
        `      - SECRET_KEY=${secretKey}`,
        `      - DJANGO_ADMIN_USERNAME=${adminUsername}`,
        `      - DJANGO_ADMIN_PASSWORD=${adminPassword}`,
        `      - DJANGO_ADMIN_EMAIL=${adminEmail}`,
        `      - PUBLIC_URL=${publicUrl}`,
        `      - CSRF_TRUSTED_ORIGINS=${csrfOrigins}`,
        `      - FRONTEND_URL=${frontendUrl}`,
        `      - DEBUG=False`,
        `    ports:`,
        `      - ${backendPort}:80`,
        `    depends_on:`,
        `      - adventurelog-db`,
        `    volumes:`,
        `      - adventurelog-media:/code/media/`,
        `    restart: unless-stopped`,
        ``,
        `  adventurelog-db:`,
        `    image: imresamu/postgis:15-3.3-alpine3.21`,
        `    container_name: adventurelog_db`,
        `    environment:`,
        `      - POSTGRES_DB=adventurelog`,
        `      - POSTGRES_USER=adventurelog`,
        `      - POSTGRES_PASSWORD=${dbPassword}`,
        `    volumes:`,
        `      - ${baseDir}/adventurelog/postgres:/var/lib/postgresql/data`,
        `    restart: unless-stopped`,
        `    healthcheck:`,
        `      test: ["CMD-SHELL", "pg_isready -U adventurelog -d adventurelog"]`,
        `      interval: 5s`,
        `      timeout: 5s`,
        `      retries: 5`,
        ``,
        `volumes:`,
        `  adventurelog-media:`,
      ];
      return lines.join("\n") + "\n";
    },
    secrets: [
      {
        envVar: "ADVENTURELOG_SECRET_KEY",
        prompt: "AdventureLog Django secret key",
        sensitive: true,
        required: true,
        generate: "openssl rand -hex 32",
      },
      {
        envVar: "ADVENTURELOG_DB_PASSWORD",
        prompt: "AdventureLog database password",
        sensitive: true,
      },
      {
        envVar: "ADVENTURELOG_ADMIN_USERNAME",
        prompt: "AdventureLog admin username (default: admin)",
        required: true,
      },
      {
        envVar: "ADVENTURELOG_ADMIN_PASSWORD",
        prompt: "AdventureLog admin password",
        sensitive: true,
        required: true,
      },
      {
        envVar: "ADVENTURELOG_ADMIN_EMAIL",
        prompt: "AdventureLog admin email (default: admin@example.com)",
        required: true,
      },
    ],
  },
  {
    name: "yourspotify",
    displayName: "Your Spotify",
    description: "Spotify listening statistics and history tracker",
    image: "yooooomi/your_spotify_server",
    containerName: "yourspotify_server",
    capacity: { performance: "low", storage: "medium", note: "Spotify history tracking with MongoDB" },
    additionalContainers: ["yourspotify_mongo", "yourspotify_web"],
    port: 3456,
    configSubdir: "db",
    needsDataDir: false,
    rawCompose: (envConfig: EnvConfig) => {
      const baseDir = envConfig.BASE_DIR;
      const localIp = envConfig.LOCAL_IP ?? "localhost";
      const duckdnsPrimary = envConfig.DUCKDNS_SUBDOMAINS?.split(",")[0].trim();
      let apiEndpoint: string;
      let clientEndpoint: string;
      if (envConfig.ENABLE_HTTPS === "true" && duckdnsPrimary) {
        apiEndpoint = `https://yourspotify-api.${duckdnsPrimary}.duckdns.org`;
        clientEndpoint = `https://yourspotify.${duckdnsPrimary}.duckdns.org`;
      } else {
        apiEndpoint = `http://${localIp}:8085`;
        clientEndpoint = `http://${localIp}:3456`;
      }
      const spotifyPublic = envConfig.YOURSPOTIFY_CLIENT_ID ?? "";
      const spotifySecret = envConfig.YOURSPOTIFY_CLIENT_SECRET ?? "";
      const lines = [
        `services:`,
        `  yourspotify-server:`,
        `    image: yooooomi/your_spotify_server`,
        `    container_name: yourspotify_server`,
        `    environment:`,
        `      - API_ENDPOINT=${apiEndpoint}`,
        `      - CLIENT_ENDPOINT=${clientEndpoint}`,
        `      - SPOTIFY_PUBLIC=${spotifyPublic}`,
        `      - SPOTIFY_SECRET=${spotifySecret}`,
        `      - MONGO_ENDPOINT=mongodb://yourspotify-mongo:27017/your_spotify`,
        `      - TZ=${envConfig.TZ}`,
        `    ports:`,
        `      - 8085:8080`,
        `    depends_on:`,
        `      - yourspotify-mongo`,
        `    restart: unless-stopped`,
        ``,
        `  yourspotify-mongo:`,
        `    image: mongo:6`,
        `    container_name: yourspotify_mongo`,
        `    volumes:`,
        `      - ${baseDir}/yourspotify/db:/data/db`,
        `    restart: unless-stopped`,
        ``,
        `  yourspotify-web:`,
        `    image: yooooomi/your_spotify_client`,
        `    container_name: yourspotify_web`,
        `    environment:`,
        `      - API_ENDPOINT=${apiEndpoint}`,
        `    ports:`,
        `      - 3456:3000`,
        `    depends_on:`,
        `      - yourspotify-server`,
        `    restart: unless-stopped`,
      ];
      return lines.join("\n") + "\n";
    },
    caddyExtraSubdomains: [{ subdomain: "yourspotify-api", port: 8085 }],
    secrets: [
      {
        envVar: "YOURSPOTIFY_CLIENT_ID",
        prompt: "Spotify application Client ID (from developer.spotify.com)",
        required: true,
      },
      {
        envVar: "YOURSPOTIFY_CLIENT_SECRET",
        prompt: "Spotify application Client Secret",
        sensitive: true,
        required: true,
      },
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
    capacity: { performance: "low", storage: "low", note: "DNS server, minimal resources" },
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
    description: "qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Navidrome, Lidarr, Immich, Profilarr",
    apps: ["qbittorrent", "prowlarr", "radarr", "sonarr", "bazarr", "seerr", "jellyfin", "navidrome", "lidarr", "immich", "profilarr"],
  },
  {
    label: "Media: Movies & TV",
    value: "media-movies-tv",
    description: "qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Profilarr",
    apps: ["qbittorrent", "prowlarr", "radarr", "sonarr", "bazarr", "seerr", "jellyfin", "profilarr"],
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
    description: "qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Navidrome, Lidarr, Immich, Profilarr",
    apps: ["qbittorrent", "prowlarr", "radarr", "sonarr", "bazarr", "seerr", "jellyfin", "navidrome", "lidarr", "immich", "profilarr"],
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
    description: "AFFiNE, Excalidraw, Omni Tools, Open WebUI, Penpot, Stirling PDF",
    apps: ["affine", "excalidraw", "omnitools", "openwebui", "penpot", "stirlingpdf"],
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
    description: "Pi-hole, WireGuard, DuckDNS, Vaultwarden",
    apps: ["pihole", "wireguard", "duckdns", "vaultwarden"],
  },
  {
    label: "Travel",
    value: "travel",
    description: "AdventureLog, TRIP",
    apps: ["adventurelog", "trip"],
  },
  {
    label: "Statistics",
    value: "statistics",
    description: "Your Spotify",
    apps: ["yourspotify"],
  },
  {
    label: "Utilities",
    value: "utilities",
    description: "Homarr",
    apps: ["homarr"],
  },
];
