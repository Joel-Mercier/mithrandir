/** Shared types for the mithrandir CLI */

export interface AppDefinition {
  /** Internal name, e.g. "radarr" */
  name: string;
  /** Display name, e.g. "Radarr" */
  displayName: string;
  /** Short description shown during setup */
  description: string;
  /** Docker image reference */
  image: string;
  /** Container name (defaults to `name` if not set) */
  containerName?: string;
  /** WebUI port (host-side), null for background services like duckdns */
  port: number | null;
  /** Container-side port when different from host port (e.g. excalidraw: host 5000, container 80) */
  containerPort?: number;
  /** Config subdirectory relative to app dir: "config", "data", "app/config" */
  configSubdir: string;
  /** For apps with multiple config dirs (homarr) */
  multipleConfigDirs?: string[];
  /** Use host networking instead of port mapping */
  networkMode?: "host";
  /** Linux capabilities to add */
  capAdd?: string[];
  /** Sysctls to set */
  sysctls?: Record<string, string>;
  /** Whether this app mounts BASE_DIR/data */
  needsDataDir: boolean;
  /** Whether data dir should be read-only */
  dataDirReadOnly?: boolean;
  /** Extra volume mounts beyond config and data: [hostRelative, container, options?] */
  extraVolumes?: Array<{ host: string; container: string; options?: string }>;
  /** Whether to mount docker socket */
  mountDockerSocket?: boolean;
  /** Environment variables required from secrets (prompted during setup) */
  secrets?: SecretDefinition[];
  /** Static environment variables set in compose */
  environment?: Record<string, string>;
  /** Use `init: true` in compose */
  init?: boolean;
  /** Use specific user in compose */
  user?: string;
  /** Healthcheck definition */
  healthcheck?: {
    test: string;
    startPeriod?: string;
    timeout?: string;
    interval?: string;
    retries?: number;
  };
  /** Additional port mappings beyond the main port: [host, container, protocol?] */
  extraPorts?: Array<{ host: number; container: number; protocol?: "tcp" | "udp" }>;
  /** Restart policy (default: "unless-stopped") */
  restartPolicy?: string;
  /** Music dir mount for navidrome */
  mountMusicDir?: boolean;
  /** Names of apps that conflict with this one (e.g. same port) */
  conflictsWith?: string[];
  /** Hide from setup app-select (still visible in backup/restore/status) */
  hidden?: boolean;
  /** Additional container names for multi-container apps (for orphan cleanup during reinstall/install) */
  additionalContainers?: string[];
  /** Custom compose generator for multi-container apps (bypasses generateCompose) */
  rawCompose?: (envConfig: EnvConfig) => string;
}

export interface SecretDefinition {
  /** Environment variable name, e.g. "DUCKDNS_TOKEN" */
  envVar: string;
  /** Human-readable prompt text */
  prompt: string;
  /** Whether to use masked input */
  sensitive?: boolean;
  /** Whether this secret is required for the app to function */
  required?: boolean;
}

export interface EnvConfig {
  BASE_DIR: string;
  PUID: string;
  PGID: string;
  TZ: string;
  DUCKDNS_SUBDOMAINS?: string;
  DUCKDNS_TOKEN?: string;
  WG_SERVERURL?: string;
  WG_PEERS?: string;
  ND_SPOTIFY_ID?: string;
  ND_SPOTIFY_SECRET?: string;
  BACKUP_DIR?: string;
  LOCAL_RETENTION?: string;
  REMOTE_RETENTION?: string;
  RCLONE_REMOTE?: string;
  APPS?: string;
  ENABLE_HTTPS?: string;
  ACME_EMAIL?: string;
  [key: string]: string | undefined;
}

export interface BackupConfig {
  BACKUP_DIR: string;
  LOCAL_RETENTION: number;
  REMOTE_RETENTION: number;
  RCLONE_REMOTE: string;
  APPS: string;
  BASE_DIR: string;
}

export interface CliFlags {
  yes?: boolean;
  help?: boolean;
  version?: boolean;
}
