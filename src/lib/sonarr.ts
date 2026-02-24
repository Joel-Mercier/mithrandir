import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// ---------------------------------------------------------------------------
// Types (subset of Sonarr v3 API)
// ---------------------------------------------------------------------------

export interface Field {
  order: number;
  name: string | null;
  label: string | null;
  unit?: string | null;
  helpText?: string | null;
  value?: unknown;
  type?: string | null;
  advanced?: boolean;
  selectOptions?: Array<{ value: number; name: string; order: number; hint?: string }> | null;
  section?: string | null;
  hidden?: string | null;
  privacy?: string;
  placeholder?: string | null;
  isFloat?: boolean;
}

export interface ProviderMessage {
  message: string | null;
  type: "info" | "warning" | "error";
}

// DownloadClient
export interface DownloadClientResource {
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage;
  tags?: number[] | null;
  presets?: DownloadClientResource[] | null;
  enable: boolean;
  protocol: "unknown" | "usenet" | "torrent";
  priority: number;
  removeCompletedDownloads: boolean;
  removeFailedDownloads: boolean;
}

// HostConfig
export interface HostConfigResource {
  id?: number;
  bindAddress?: string | null;
  port?: number;
  sslPort?: number;
  enableSsl?: boolean;
  launchBrowser?: boolean;
  authenticationMethod?: "none" | "basic" | "forms" | "external";
  authenticationRequired?: "enabled" | "disabledForLocalAddresses";
  analyticsEnabled?: boolean;
  username?: string | null;
  password?: string | null;
  passwordConfirmation?: string | null;
  logLevel?: string | null;
  logSizeLimit?: number;
  consoleLogLevel?: string | null;
  branch?: string | null;
  apiKey?: string | null;
  sslCertPath?: string | null;
  sslCertPassword?: string | null;
  urlBase?: string | null;
  instanceName?: string | null;
  applicationUrl?: string | null;
  updateAutomatically?: boolean;
  updateMechanism?: "builtIn" | "script" | "external" | "apt" | "docker";
  updateScriptPath?: string | null;
  proxyEnabled?: boolean;
  proxyType?: "http" | "socks4" | "socks5";
  proxyHostname?: string | null;
  proxyPort?: number;
  proxyUsername?: string | null;
  proxyPassword?: string | null;
  proxyBypassFilter?: string | null;
  proxyBypassLocalAddresses?: boolean;
  certificateValidation?: "enabled" | "disabledForLocalAddresses" | "disabled";
  backupFolder?: string | null;
  backupInterval?: number;
  backupRetention?: number;
  trustCgnatIpAddresses?: boolean;
}

// Indexer
export interface IndexerResource {
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage;
  tags?: number[] | null;
  presets?: IndexerResource[] | null;
  enableRss: boolean;
  enableAutomaticSearch: boolean;
  enableInteractiveSearch: boolean;
  supportsRss?: boolean;
  supportsSearch?: boolean;
  protocol: "unknown" | "usenet" | "torrent";
  priority: number;
  seasonSearchMaximumSingleEpisodeAge?: number;
  downloadClientId?: number;
}

// IndexerConfig
export interface IndexerConfigResource {
  id?: number;
  minimumAge: number;
  retention: number;
  maximumSize: number;
  rssSyncInterval: number;
}

// DownloadClientConfig
export interface DownloadClientConfigResource {
  id?: number;
  downloadClientWorkingFolders?: string | null;
  enableCompletedDownloadHandling: boolean;
  autoRedownloadFailed: boolean;
  autoRedownloadFailedFromInteractiveSearch?: boolean;
}

// RootFolder
export interface UnmappedFolder {
  name?: string | null;
  path?: string | null;
  relativePath?: string | null;
}

export interface RootFolderResource {
  id?: number;
  path: string;
  accessible?: boolean;
  freeSpace?: number | null;
  unmappedFolders?: UnmappedFolder[] | null;
}

// ---------------------------------------------------------------------------
// API key retrieval from config.xml
// ---------------------------------------------------------------------------

/**
 * Read the Sonarr API key from BASE_DIR/sonarr/config/config.xml.
 * Returns null if the file does not exist or the key cannot be parsed.
 */
export async function getSonarrApiKey(baseDir: string): Promise<string | null> {
  const configPath = join(baseDir, "sonarr", "config", "config.xml");
  if (!existsSync(configPath)) return null;
  try {
    const xml = await readFile(configPath, "utf-8");
    const match = xml.match(/<ApiKey>([^<]+)<\/ApiKey>/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface SonarrClientOptions {
  /** Base URL of the Sonarr instance (default: http://localhost:8989) */
  baseUrl?: string;
  /** API key — if omitted, getSonarrApiKey() must have been called first */
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
    throw new Error(`Sonarr API ${method} ${path} → ${res.status} ${res.statusText}: ${text}`);
  }

  // Some DELETE endpoints return 200 with no body
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

export function createSonarrClient(options: SonarrClientOptions) {
  const baseUrl = (options.baseUrl ?? "http://localhost:8989").replace(/\/$/, "");
  const { apiKey } = options;

  const get = <T>(path: string) => request<T>(baseUrl, apiKey, "GET", path);
  const post = <T>(path: string, body: unknown) => request<T>(baseUrl, apiKey, "POST", path, body);
  const put = <T>(path: string, body: unknown) => request<T>(baseUrl, apiKey, "PUT", path, body);
  const del = (path: string) => request<void>(baseUrl, apiKey, "DELETE", path);

  return {
    // -----------------------------------------------------------------------
    // DownloadClient  /api/v3/downloadclient
    // -----------------------------------------------------------------------
    downloadClient: {
      getAll: () => get<DownloadClientResource[]>("/api/v3/downloadclient"),
      getById: (id: number) => get<DownloadClientResource>(`/api/v3/downloadclient/${id}`),
      create: (resource: DownloadClientResource, forceSave = false) =>
        post<DownloadClientResource>(
          `/api/v3/downloadclient?forceSave=${forceSave}`,
          resource,
        ),
      update: (id: number, resource: DownloadClientResource, forceSave = false) =>
        put<DownloadClientResource>(
          `/api/v3/downloadclient/${id}?forceSave=${forceSave}`,
          resource,
        ),
      delete: (id: number) => del(`/api/v3/downloadclient/${id}`),
      getSchema: () => get<DownloadClientResource[]>("/api/v3/downloadclient/schema"),
      test: (resource: DownloadClientResource, forceTest = false) =>
        post<void>(`/api/v3/downloadclient/test?forceTest=${forceTest}`, resource),
      testAll: () => post<void>("/api/v3/downloadclient/testall", {}),
    },

    // -----------------------------------------------------------------------
    // DownloadClientConfig  /api/v3/config/downloadclient
    // -----------------------------------------------------------------------
    downloadClientConfig: {
      get: () => get<DownloadClientConfigResource>("/api/v3/config/downloadclient"),
      update: (id: number, resource: DownloadClientConfigResource) =>
        put<DownloadClientConfigResource>(`/api/v3/config/downloadclient/${id}`, resource),
    },

    // -----------------------------------------------------------------------
    // HostConfig  /api/v3/config/host
    // -----------------------------------------------------------------------
    hostConfig: {
      get: () => get<HostConfigResource>("/api/v3/config/host"),
      update: (id: number, resource: HostConfigResource) =>
        put<HostConfigResource>(`/api/v3/config/host/${id}`, resource),
    },

    // -----------------------------------------------------------------------
    // Indexer  /api/v3/indexer
    // -----------------------------------------------------------------------
    indexer: {
      getAll: () => get<IndexerResource[]>("/api/v3/indexer"),
      getById: (id: number) => get<IndexerResource>(`/api/v3/indexer/${id}`),
      create: (resource: IndexerResource, forceSave = false) =>
        post<IndexerResource>(`/api/v3/indexer?forceSave=${forceSave}`, resource),
      update: (id: number, resource: IndexerResource, forceSave = false) =>
        put<IndexerResource>(`/api/v3/indexer/${id}?forceSave=${forceSave}`, resource),
      delete: (id: number) => del(`/api/v3/indexer/${id}`),
      getSchema: () => get<IndexerResource[]>("/api/v3/indexer/schema"),
      test: (resource: IndexerResource, forceTest = false) =>
        post<void>(`/api/v3/indexer/test?forceTest=${forceTest}`, resource),
      testAll: () => post<void>("/api/v3/indexer/testall", {}),
    },

    // -----------------------------------------------------------------------
    // IndexerConfig  /api/v3/config/indexer
    // -----------------------------------------------------------------------
    indexerConfig: {
      get: () => get<IndexerConfigResource>("/api/v3/config/indexer"),
      update: (id: number, resource: IndexerConfigResource) =>
        put<IndexerConfigResource>(`/api/v3/config/indexer/${id}`, resource),
    },

    // -----------------------------------------------------------------------
    // RootFolder  /api/v3/rootfolder
    // -----------------------------------------------------------------------
    rootFolder: {
      getAll: () => get<RootFolderResource[]>("/api/v3/rootfolder"),
      getById: (id: number) => get<RootFolderResource>(`/api/v3/rootfolder/${id}`),
      create: (resource: RootFolderResource) =>
        post<RootFolderResource>("/api/v3/rootfolder", resource),
      delete: (id: number) => del(`/api/v3/rootfolder/${id}`),
    },
  };
}

export type SonarrClient = ReturnType<typeof createSonarrClient>;
