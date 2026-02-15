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
  /** WebUI port, null for background services like duckdns */
  port: number | null;
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
}

export interface SecretDefinition {
  /** Environment variable name, e.g. "DUCKDNS_TOKEN" */
  envVar: string;
  /** Human-readable prompt text */
  prompt: string;
  /** Whether to use masked input */
  sensitive?: boolean;
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
