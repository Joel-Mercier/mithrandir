// ---------------------------------------------------------------------------
// Types (subset of Jellyfin API)
// ---------------------------------------------------------------------------

// Startup wizard
export interface StartupConfigurationDto {
  ServerName?: string | null;
  UICulture?: string | null;
  MetadataCountryCode?: string | null;
  PreferredMetadataLanguage?: string | null;
}

export interface StartupUserDto {
  Name?: string | null;
  Password?: string | null;
}

export interface StartupRemoteAccessDto {
  EnableRemoteAccess: boolean;
  /** @deprecated UPnP is no longer supported */
  EnableAutomaticPortMapping: boolean;
}

// Auth / API keys
export interface AuthenticationInfo {
  Id: number;
  AccessToken?: string | null;
  AppName?: string | null;
  AppVersion?: string | null;
  DeviceId?: string | null;
  DeviceName?: string | null;
  UserId?: string;
  IsActive?: boolean;
  DateCreated?: string;
  DateRevoked?: string | null;
  DateLastActivity?: string;
  UserName?: string | null;
}

export interface AuthenticationInfoQueryResult {
  Items: AuthenticationInfo[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface AuthenticationResult {
  User?: UserDto | null;
  AccessToken?: string | null;
  ServerId?: string | null;
}

// Users
export interface UserDto {
  Name?: string | null;
  Id: string;
  ServerId?: string | null;
  HasPassword?: boolean;
  HasConfiguredPassword?: boolean;
  LastLoginDate?: string | null;
  LastActivityDate?: string | null;
}

// System
export interface PublicSystemInfo {
  LocalAddress?: string | null;
  ServerName?: string | null;
  Version?: string | null;
  Id?: string | null;
  StartupWizardCompleted?: boolean | null;
}


// Library
export interface VirtualFolderDto {
  name: string;
  collectionType: CollectionTypeOptions;
  paths: string[];
  refreshLibrary?: boolean;
}

export type CollectionTypeOptions = "movies" | "tvshows" | "music" | "musicvideos" | "homevideos" | "boxsets" | "books" | "mixed";

export interface VirtualFolderInfo {
  Name?: string | null;
  Locations?: string[] | null;
  CollectionType?: CollectionTypeOptions | null;
  ItemId?: string | null;
}

// ---------------------------------------------------------------------------
// Internal HTTP helpers
// ---------------------------------------------------------------------------

const CLIENT_NAME = "mithrandir";
const CLIENT_VERSION = "1.0.0";
const DEVICE_NAME = "mithrandir-cli";
const DEVICE_ID = "mithrandir-cli-static";

function authorizationHeader(token?: string): string {
  const parts = [
    `Client="${CLIENT_NAME}"`,
    `Device="${DEVICE_NAME}"`,
    `DeviceId="${DEVICE_ID}"`,
    `Version="${CLIENT_VERSION}"`,
  ];
  if (token) parts.push(`Token="${token}"`);
  return `MediaBrowser ${parts.join(", ")}`;
}

async function request<T>(
  baseUrl: string,
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authorizationHeader(token),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jellyfin API ${method} ${path} → ${res.status} ${res.statusText}: ${text}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API key retrieval via the API
// ---------------------------------------------------------------------------

/**
 * Authenticate with Jellyfin using username/password, then create (or retrieve
 * an existing) API key named after `appName`. Returns the API key string, or
 * null if authentication fails.
 *
 * This is the preferred approach instead of reading from a config file because
 * Jellyfin exposes key management through its REST API.
 */
export async function getJellyfinApiKey(
  baseUrl: string,
  username: string,
  password: string,
  appName = CLIENT_NAME,
): Promise<string | null> {
  const normalizedBase = baseUrl.replace(/\/$/, "");

  // Step 1: authenticate to obtain a session token
  let authResult: AuthenticationResult;
  try {
    authResult = await request<AuthenticationResult>(
      normalizedBase,
      "POST",
      "/Users/AuthenticateByName",
      undefined, // no token yet — this endpoint is unauthenticated
      { Username: username, Pw: password },
    );
  } catch {
    return null;
  }

  const sessionToken = authResult.AccessToken;
  if (!sessionToken) return null;

  // Step 2: check if an API key for this app already exists
  try {
    const existing = await request<AuthenticationInfoQueryResult>(
      normalizedBase,
      "GET",
      "/Auth/Keys",
      sessionToken,
    );
    const found = existing.Items.find((k) => k.AppName === appName && k.IsActive !== false);
    if (found?.AccessToken) return found.AccessToken;
  } catch {
    // if listing fails (e.g. not admin), fall through and try creating
  }

  // Step 3: create a new API key
  try {
    await request<void>(
      normalizedBase,
      "POST",
      `/Auth/Keys?app=${encodeURIComponent(appName)}`,
      sessionToken,
    );
  } catch {
    return null;
  }

  // Step 4: retrieve the newly created key
  try {
    const result = await request<AuthenticationInfoQueryResult>(
      normalizedBase,
      "GET",
      "/Auth/Keys",
      sessionToken,
    );
    const created = result.Items.find((k) => k.AppName === appName && k.IsActive !== false);
    return created?.AccessToken ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface JellyfinClientOptions {
  /** Base URL of the Jellyfin instance (default: http://localhost:8096) */
  baseUrl?: string;
  /**
   * API key or session token. Optional — startup wizard endpoints are
   * accessible during first-time setup without authentication.
   */
  apiKey?: string;
}

export function createJellyfinClient(options: JellyfinClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? "http://localhost:8096").replace(/\/$/, "");
  const token = options.apiKey;

  const get = <T>(path: string) => request<T>(baseUrl, "GET", path, token);
  const post = <T>(path: string, body?: unknown) =>
    request<T>(baseUrl, "POST", path, token, body ?? {});
  const del = (path: string) => request<void>(baseUrl, "DELETE", path, token);

  return {
    // -----------------------------------------------------------------------
    // System  /System
    // -----------------------------------------------------------------------
    system: {
      /** Returns public server info including whether the startup wizard is complete. */
      getPublicInfo: () => get<PublicSystemInfo>("/System/Info/Public"),
    },

    // -----------------------------------------------------------------------
    // Startup wizard  /Startup
    // Accessible without auth during first-time setup (FirstTimeSetupOrElevated).
    // -----------------------------------------------------------------------
    startup: {
      /** Gets the current startup wizard configuration (server name, locale, etc.). */
      getConfiguration: () => get<StartupConfigurationDto>("/Startup/Configuration"),

      /** Sets the server name, UI culture, and metadata locale. */
      updateConfiguration: (dto: StartupConfigurationDto) =>
        post<void>("/Startup/Configuration", dto),

      /** Gets the initial admin user that will be created during setup. */
      getFirstUser: () => get<StartupUserDto>("/Startup/User"),

      /** Sets the admin username and password for the first user. */
      updateUser: (dto: StartupUserDto) => post<void>("/Startup/User", dto),

      /** Configures remote access and (deprecated) UPnP port mapping. */
      setRemoteAccess: (dto: StartupRemoteAccessDto) =>
        post<void>("/Startup/RemoteAccess", dto),

      /** Marks the startup wizard as complete. Must be called last. */
      complete: () => post<void>("/Startup/Complete"),
    },

    // -----------------------------------------------------------------------
    // API keys  /Auth/Keys
    // Requires admin authentication (RequiresElevation).
    // -----------------------------------------------------------------------
    apiKeys: {
      /** Lists all active API keys. */
      getAll: () => get<AuthenticationInfoQueryResult>("/Auth/Keys"),

      /** Creates a new API key with the given application name. */
      create: (app: string) => post<void>(`/Auth/Keys?app=${encodeURIComponent(app)}`),

      /** Revokes (deletes) an API key by its token string. */
      revoke: (key: string) => del(`/Auth/Keys/${encodeURIComponent(key)}`),
    },

    // -----------------------------------------------------------------------
    // Users  /Users
    // -----------------------------------------------------------------------
    users: {
      /** Authenticates a user by name and password. Returns a session token. */
      authenticateByName: (username: string, password: string) =>
        post<AuthenticationResult>("/Users/AuthenticateByName", {
          Username: username,
          Pw: password,
        }),

      /** Lists all users (requires DefaultAuthorization). */
      getAll: () => get<UserDto[]>("/Users"),
    },

    // -----------------------------------------------------------------------
    // Library  /Library
    // Requires admin authentication.
    // -----------------------------------------------------------------------
    library: {
      /**
       * Creates a media library (virtual folder).
       * name, collectionType, paths, refreshLibrary are all query params;
       * body contains only LibraryOptions.
       */
      addVirtualFolder: (resource: VirtualFolderDto) => {
        const qs = new URLSearchParams();
        qs.set("name", resource.name);
        qs.set("collectionType", resource.collectionType);
        qs.set("refreshLibrary", String(resource.refreshLibrary ?? false));
        for (const p of resource.paths) {
          qs.append("paths", p);
        }
        return post<void>(`/Library/VirtualFolders?${qs.toString()}`, {
          LibraryOptions: {},
        });
      },
    },
  };
}

export type JellyfinClient = ReturnType<typeof createJellyfinClient>;
