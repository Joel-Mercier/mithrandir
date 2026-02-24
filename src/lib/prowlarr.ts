import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// ---------------------------------------------------------------------------
// Types (subset of Prowlarr v1 API)
// ---------------------------------------------------------------------------

export interface Field {
  order: number;
  name: string | null;
  label: string | null;
  unit?: string | null;
  helpText?: string | null;
  helpTextWarning?: string | null;
  helpLink?: string | null;
  value?: unknown;
  type?: string | null;
  advanced?: boolean;
  selectOptions?: Array<{ value: number; name: string; order: number; hint?: string; parentValue?: number | null }> | null;
  selectOptionsProviderAction?: string | null;
  section?: string | null;
  hidden?: string | null;
  privacy?: "normal" | "password" | "apiKey" | "userName";
  placeholder?: string | null;
  isFloat?: boolean;
}

export interface ProviderMessage {
  message: string | null;
  type: "info" | "warning" | "error";
}

// Application
export type ApplicationSyncLevel = "disabled" | "addOnly" | "fullSync";

export interface ApplicationResource {
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage;
  tags?: number[] | null;
  presets?: ApplicationResource[] | null;
  syncLevel: ApplicationSyncLevel;
  testCommand?: string | null;
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
  historyCleanupDays?: number;
  trustCgnatIpAddresses?: boolean;
}

// Indexer
export type IndexerPrivacy = "public" | "semiPrivate" | "private";

export interface IndexerCategory {
  id?: number;
  name?: string | null;
  description?: string | null;
  subCategories?: IndexerCategory[] | null;
}

export interface IndexerCapabilityResource {
  id?: number;
  limitsMax?: number | null;
  limitsDefault?: number | null;
  categories?: IndexerCategory[] | null;
  supportsRawSearch?: boolean;
  searchParams?: string[] | null;
  tvSearchParams?: string[] | null;
  movieSearchParams?: string[] | null;
  musicSearchParams?: string[] | null;
  bookSearchParams?: string[] | null;
}

export interface IndexerStatusResource {
  id?: number;
  indexerId?: number;
  disabledTill?: string | null;
  mostRecentFailure?: string | null;
  initialFailure?: string | null;
}

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
  indexerUrls?: string[] | null;
  legacyUrls?: string[] | null;
  definitionName?: string | null;
  description?: string | null;
  language?: string | null;
  encoding?: string | null;
  enable?: boolean;
  redirect?: boolean;
  supportsRss?: boolean;
  supportsSearch?: boolean;
  supportsRedirect?: boolean;
  supportsPagination?: boolean;
  appProfileId?: number;
  protocol?: "unknown" | "usenet" | "torrent";
  privacy?: IndexerPrivacy;
  capabilities?: IndexerCapabilityResource;
  priority?: number;
  downloadClientId?: number;
  added?: string;
  status?: IndexerStatusResource;
  sortName?: string | null;
}

// ---------------------------------------------------------------------------
// API key retrieval from config.xml
// ---------------------------------------------------------------------------

/**
 * Read the Prowlarr API key from BASE_DIR/prowlarr/config/config.xml.
 * Returns null if the file does not exist or the key cannot be parsed.
 */
export async function getProwlarrApiKey(baseDir: string): Promise<string | null> {
  const configPath = join(baseDir, "prowlarr", "config", "config.xml");
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

export interface ProwlarrClientOptions {
  /** Base URL of the Prowlarr instance (default: http://localhost:9696) */
  baseUrl?: string;
  /** API key — if omitted, getProwlarrApiKey() must have been called first */
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
    throw new Error(`Prowlarr API ${method} ${path} → ${res.status} ${res.statusText}: ${text}`);
  }

  // Some DELETE endpoints return 200 with no body
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

export function createProwlarrClient(options: ProwlarrClientOptions) {
  const baseUrl = (options.baseUrl ?? "http://localhost:9696").replace(/\/$/, "");
  const { apiKey } = options;

  const get = <T>(path: string) => request<T>(baseUrl, apiKey, "GET", path);
  const post = <T>(path: string, body: unknown) => request<T>(baseUrl, apiKey, "POST", path, body);
  const put = <T>(path: string, body: unknown) => request<T>(baseUrl, apiKey, "PUT", path, body);
  const del = (path: string) => request<void>(baseUrl, apiKey, "DELETE", path);

  return {
    // -----------------------------------------------------------------------
    // Application  /api/v1/applications
    // -----------------------------------------------------------------------
    application: {
      getAll: () => get<ApplicationResource[]>("/api/v1/applications"),
      getById: (id: number) => get<ApplicationResource>(`/api/v1/applications/${id}`),
      create: (resource: ApplicationResource, forceSave = false) =>
        post<ApplicationResource>(`/api/v1/applications?forceSave=${forceSave}`, resource),
      update: (id: number, resource: ApplicationResource, forceSave = false) =>
        put<ApplicationResource>(`/api/v1/applications/${id}?forceSave=${forceSave}`, resource),
      delete: (id: number) => del(`/api/v1/applications/${id}`),
      getSchema: () => get<ApplicationResource[]>("/api/v1/applications/schema"),
      test: (resource: ApplicationResource, forceTest = false) =>
        post<void>(`/api/v1/applications/test?forceTest=${forceTest}`, resource),
      testAll: () => post<void>("/api/v1/applications/testall", {}),
    },

    // -----------------------------------------------------------------------
    // HostConfig  /api/v1/config/host
    // -----------------------------------------------------------------------
    hostConfig: {
      get: () => get<HostConfigResource>("/api/v1/config/host"),
      update: (id: number, resource: HostConfigResource) =>
        put<HostConfigResource>(`/api/v1/config/host/${id}`, resource),
    },

    // -----------------------------------------------------------------------
    // Indexer  /api/v1/indexer
    // -----------------------------------------------------------------------
    indexer: {
      getAll: () => get<IndexerResource[]>("/api/v1/indexer"),
      getById: (id: number) => get<IndexerResource>(`/api/v1/indexer/${id}`),
      create: (resource: IndexerResource, forceSave = false) =>
        post<IndexerResource>(`/api/v1/indexer?forceSave=${forceSave}`, resource),
      update: (id: number, resource: IndexerResource, forceSave = false) =>
        put<IndexerResource>(`/api/v1/indexer/${id}?forceSave=${forceSave}`, resource),
      delete: (id: number) => del(`/api/v1/indexer/${id}`),
      getSchema: () => get<IndexerResource[]>("/api/v1/indexer/schema"),
      test: (resource: IndexerResource, forceTest = false) =>
        post<void>(`/api/v1/indexer/test?forceTest=${forceTest}`, resource),
      testAll: () => post<void>("/api/v1/indexer/testall", {}),
    },
  };
}

export type ProwlarrClient = ReturnType<typeof createProwlarrClient>;
