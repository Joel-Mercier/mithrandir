import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// ---------------------------------------------------------------------------
// Types (subset of Seerr v1 API — sourced from /api-docs)
// ---------------------------------------------------------------------------

// Auth
export interface LocalLoginInput {
  email: string;
  password: string;
}

export interface JellyfinLoginInput {
  username: string;
  password: string;
  /** Bare IP or domain of the Jellyfin server (NOT a full URL). */
  hostname?: string;
  /** Jellyfin port (default 8096). */
  port?: number;
  /** Whether Jellyfin uses SSL. */
  useSsl?: boolean;
  /** URL base path (e.g. "" or "/jellyfin"). */
  urlBase?: string;
  email?: string;
  /** 1 = Jellyfin, 2 = Emby. Required for first-time setup. */
  serverType?: number;
}

// User
export interface UserDto {
  id: number;
  email: string;
  username?: string | null;
  plexUsername?: string | null;
  plexToken?: string | null;
  jellyfinAuthToken?: string | null;
  userType: number;
  permissions: number;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
  requestCount?: number;
}

// Users list
export interface PageInfo {
  page: number;
  pages: number;
  results: number;
}

export interface UserResultsResponse {
  pageInfo: PageInfo;
  results: UserDto[];
}

// Jellyfin settings
export interface JellyfinLibrary {
  id: string;
  name: string;
  enabled: boolean;
}

/** `hostname` is the full URL, e.g. `http://my.jellyfin.host` */
export interface JellyfinSettings {
  /** Server display name (read-only). */
  name?: string | null;
  /** Full Jellyfin URL including scheme, e.g. http://192.168.1.10:8096 */
  hostname?: string | null;
  externalHostname?: string | null;
  jellyfinForgotPasswordUrl?: string | null;
  adminUser?: string | null;
  adminPass?: string | null;
  /** Configured libraries (read-only; managed via /settings/jellyfin/library). */
  libraries?: JellyfinLibrary[];
  /** Jellyfin server ID (read-only). */
  serverID?: string | null;
}

// Jellyfin users (raw Jellyfin user records, not Seerr UserDto)
export interface JellyfinUserRecord {
  username: string;
  id: string;
  thumb?: string;
  email?: string;
}

// Jellyfin library sync status
export interface JellyfinSyncStatus {
  running: boolean;
  progress: number;
  total: number;
  currentLibrary?: JellyfinLibrary;
  libraries: JellyfinLibrary[];
}

// Radarr settings
export interface RadarrSettings {
  /** Read-only — omit when creating. */
  id?: number;
  name: string;
  hostname: string;
  port: number;
  apiKey: string;
  useSsl: boolean;
  baseUrl?: string | null;
  activeProfileId: number;
  activeProfileName: string;
  activeDirectory: string;
  is4k: boolean;
  minimumAvailability: string;
  isDefault: boolean;
  externalUrl?: string | null;
  syncEnabled?: boolean;
  preventSearch?: boolean;
}

// Sonarr settings
export interface SonarrSettings {
  /** Read-only — omit when creating. */
  id?: number;
  name: string;
  hostname: string;
  port: number;
  apiKey: string;
  useSsl: boolean;
  baseUrl?: string | null;
  activeProfileId: number;
  activeProfileName: string;
  activeDirectory: string;
  activeLanguageProfileId?: number | null;
  activeAnimeProfileId?: number | null;
  activeAnimeLanguageProfileId?: number | null;
  activeAnimeProfileName?: string | null;
  activeAnimeDirectory?: string | null;
  is4k: boolean;
  enableSeasonFolders: boolean;
  isDefault: boolean;
  externalUrl?: string | null;
  syncEnabled?: boolean;
  preventSearch?: boolean;
}

// Test connection input
export interface TestConnectionInput {
  hostname: string;
  port: number;
  apiKey: string;
  useSsl: boolean;
  baseUrl?: string;
}

// Test connection response
export interface ServiceProfile {
  id: number;
  name: string;
}

export interface TestConnectionResponse {
  profiles: ServiceProfile[];
}

// ---------------------------------------------------------------------------
// API key retrieval from settings.json
// ---------------------------------------------------------------------------

/**
 * Read the Seerr API key from BASE_DIR/seerr/app/config/settings.json.
 * Returns null if the file does not exist or the key cannot be parsed.
 */
export async function getSeerrApiKey(baseDir: string): Promise<string | null> {
  const configPath = join(baseDir, "seerr", "app", "config", "settings.json");
  if (!existsSync(configPath)) return null;
  try {
    const raw = await readFile(configPath, "utf-8");
    const data = JSON.parse(raw) as { main?: { apiKey?: string } };
    return data?.main?.apiKey?.trim() ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface SeerrClientOptions {
  /** Base URL of the Seerr instance (default: http://localhost:5055) */
  baseUrl?: string;
  /** API key for X-Api-Key header authentication. */
  apiKey: string;
}

async function request<T>(
  baseUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Seerr API ${method} ${path} → ${res.status} ${res.statusText}: ${text}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

export function createSeerrClient(options: SeerrClientOptions) {
  const baseUrl = (options.baseUrl ?? "http://localhost:5055").replace(/\/$/, "") + "/api/v1";
  const { apiKey } = options;

  const get = <T>(path: string) => request<T>(baseUrl, apiKey, "GET", path);
  const post = <T>(path: string, body?: unknown) =>
    request<T>(baseUrl, apiKey, "POST", path, body ?? {});
  const put = <T>(path: string, body: unknown) => request<T>(baseUrl, apiKey, "PUT", path, body);
  const del = (path: string) => request<void>(baseUrl, apiKey, "DELETE", path);

  return {
    // -----------------------------------------------------------------------
    // Auth  /api/v1/auth
    // -----------------------------------------------------------------------
    auth: {
      /** Authenticate with a local Seerr account. Returns the logged-in user. */
      loginLocal: (input: LocalLoginInput) =>
        post<UserDto>("/auth/local", input),

      /** Authenticate via Jellyfin credentials. Returns the logged-in user. */
      loginJellyfin: (input: JellyfinLoginInput) =>
        post<UserDto>("/auth/jellyfin", input),

      /** Returns the currently authenticated user (validates the API key). */
      me: () => get<UserDto>("/auth/me"),
    },

    // -----------------------------------------------------------------------
    // Settings — Jellyfin  /api/v1/settings/jellyfin
    // -----------------------------------------------------------------------
    jellyfinSettings: {
      /** Gets the current Jellyfin server configuration. */
      get: () => get<JellyfinSettings>("/settings/jellyfin"),

      /** Updates the Jellyfin server configuration. */
      update: (settings: JellyfinSettings) =>
        post<JellyfinSettings>("/settings/jellyfin", settings),

      /**
       * Fetches available libraries from the connected Jellyfin server.
       * Pass `sync=true` to re-sync from Jellyfin.
       * Pass `enable` as a comma-separated list of library IDs to enable (all others disabled).
       */
      getLibraries: (params?: { sync?: boolean; enable?: string }) => {
        const qs = params
          ? "?" +
            new URLSearchParams(
              Object.entries(params)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)]),
            ).toString()
          : "";
        return get<JellyfinLibrary[]>(`/settings/jellyfin/library${qs}`);
      },

      /** Lists raw Jellyfin user accounts from the connected Jellyfin server. */
      getJellyfinUsers: () => get<JellyfinUserRecord[]>("/settings/jellyfin/users"),

      /** Gets the current full library sync status. */
      getSyncStatus: () => get<JellyfinSyncStatus>("/settings/jellyfin/sync"),

      /** Starts or cancels a full Jellyfin library sync. */
      sync: (params: { start?: boolean; cancel?: boolean }) =>
        post<JellyfinSyncStatus>("/settings/jellyfin/sync", params),
    },

    // -----------------------------------------------------------------------
    // Settings — Radarr  /api/v1/settings/radarr
    // -----------------------------------------------------------------------
    radarr: {
      /** Lists all configured Radarr instances. */
      getAll: () => get<RadarrSettings[]>("/settings/radarr"),

      /** Adds a new Radarr instance. */
      create: (settings: Omit<RadarrSettings, "id">) =>
        post<RadarrSettings>("/settings/radarr", settings),

      /** Updates an existing Radarr instance. */
      update: (id: number, settings: RadarrSettings) =>
        put<RadarrSettings>(`/settings/radarr/${id}`, settings),

      /** Deletes a Radarr instance. */
      delete: (id: number) => del(`/settings/radarr/${id}`),

      /** Tests a Radarr connection before saving. Returns available profiles. */
      test: (input: TestConnectionInput) =>
        post<TestConnectionResponse>("/settings/radarr/test", input),

      /** Returns the quality profiles available on a saved Radarr instance. */
      getProfiles: (id: number) =>
        get<ServiceProfile[]>(`/settings/radarr/${id}/profiles`),
    },

    // -----------------------------------------------------------------------
    // Settings — Sonarr  /api/v1/settings/sonarr
    // -----------------------------------------------------------------------
    sonarr: {
      /** Lists all configured Sonarr instances. */
      getAll: () => get<SonarrSettings[]>("/settings/sonarr"),

      /** Adds a new Sonarr instance. */
      create: (settings: Omit<SonarrSettings, "id">) =>
        post<SonarrSettings>("/settings/sonarr", settings),

      /** Updates an existing Sonarr instance. */
      update: (id: number, settings: SonarrSettings) =>
        put<SonarrSettings>(`/settings/sonarr/${id}`, settings),

      /** Deletes a Sonarr instance. */
      delete: (id: number) => del(`/settings/sonarr/${id}`),

      /** Tests a Sonarr connection before saving. Returns available profiles. */
      test: (input: TestConnectionInput) =>
        post<TestConnectionResponse>("/settings/sonarr/test", input),
    },

    // -----------------------------------------------------------------------
    // Users  /api/v1/user
    // -----------------------------------------------------------------------
    users: {
      /** Lists all Seerr users, paginated. */
      getAll: (params?: {
        take?: number;
        skip?: number;
        sort?: "created" | "updated" | "requests" | "displayname";
        q?: string;
      }) => {
        const qs = params
          ? "?" +
            new URLSearchParams(
              Object.entries(params)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)]),
            ).toString()
          : "";
        return get<UserResultsResponse>(`/user${qs}`);
      },

      /**
       * Imports users from the connected Jellyfin server.
       * Optionally restrict to specific Jellyfin user IDs.
       */
      importFromJellyfin: (jellyfinUserIds?: string[]) =>
        post<UserDto[]>(
          "/user/import-from-jellyfin",
          jellyfinUserIds !== undefined ? { jellyfinUserIds } : undefined,
        ),
    },
  };
}

export type SeerrClient = ReturnType<typeof createSeerrClient>;
