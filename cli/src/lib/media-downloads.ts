/**
 * Media download housekeeping for the qBittorrent + Radarr/Sonarr/Lidarr stack.
 *
 * Layout: qBittorrent saves to /data/downloads/<movies|tv|music>, the *arrs
 * hardlink imports into /data/media/<…>. A hardlinked file only frees disk
 * space once *both* names are gone, so deleting from the library alone leaves
 * the seeding copy behind.
 *
 * This module:
 *   - inspects / fixes the settings that make this work (categories with
 *     explicit save paths, "imported" categories, no automatic removal, an
 *     *arr webhook that notifies the mithrandir UI on deletes),
 *   - scans the downloads folder (hardlink counts) to find space that is no
 *     longer used by the library,
 *   - removes torrents whose library files were deliberately deleted in an
 *     *arr app (webhook-driven, never time or ratio based),
 *   - prunes leftovers on explicit request only.
 */
import { existsSync } from "fs";
import { lstat, readdir, rmdir, stat } from "fs/promises";
import { join, relative, resolve } from "path";
import { randomBytes } from "crypto";
import { getApp, getComposePath } from "@/lib/apps.js";
import { saveEnvConfig } from "@/lib/config.js";
import { getLocalIp } from "@/lib/distro.js";
import { deletePaths } from "@/lib/filesystem.js";
import {
  createQBittorrentClient,
  getQBittorrentCredentials,
  type QBittorrentClient,
  type QBittorrentPreferences,
  type QBittorrentTorrent,
} from "@/lib/qbittorrent.js";
import { createLidarrClient, getLidarrApiKey } from "@/lib/lidarr.js";
import { createRadarrClient, getRadarrApiKey } from "@/lib/radarr.js";
import { createSonarrClient, getSonarrApiKey } from "@/lib/sonarr.js";
import { shell } from "@/lib/shell.js";
import { isUiServiceActive, UI_PORT } from "@/lib/systemd-ui.js";
import { allowDockerToHostPort } from "@/lib/ufw.js";
import type { EnvConfig } from "@/types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

export const QBITTORRENT_PORT = 8080;
export const CONTAINER_DATA_ROOT = "/data";
export const CONTAINER_DOWNLOADS_ROOT = "/data/downloads";
export const MEDIA_WEBHOOK_PATH = "/api/media/arr-webhook";
export const MEDIA_WEBHOOK_NAME = "Mithrandir download cleanup";
export const MEDIA_WEBHOOK_USERNAME = "mithrandir";
/** qBittorrent tag set on torrents seen hardlinked into the library */
export const LINKED_TAG = "mithrandir-linked";
/** Orphans modified more recently than this are left alone (may still be written) */
const ORPHAN_MIN_AGE_MS = 10 * 60 * 1000;

export type ArrName = "radarr" | "sonarr" | "lidarr";

export interface ArrProfile {
  name: ArrName;
  label: string;
  port: number;
  /** Folder under data/downloads and data/media */
  dir: "movies" | "tv" | "music";
  category: string;
  importedCategory: string;
  /** Category the *arr used before mithrandir configured one */
  legacyCategory: string;
  categoryField: string;
  importedCategoryField: string;
  unmonitorKey: string;
}

export const ARR_PROFILES: ArrProfile[] = [
  {
    name: "radarr",
    label: "Radarr",
    port: 7878,
    dir: "movies",
    category: "movies",
    importedCategory: "movies-imported",
    legacyCategory: "radarr",
    categoryField: "movieCategory",
    importedCategoryField: "movieImportedCategory",
    unmonitorKey: "autoUnmonitorPreviouslyDownloadedMovies",
  },
  {
    name: "sonarr",
    label: "Sonarr",
    port: 8989,
    dir: "tv",
    category: "tv",
    importedCategory: "tv-imported",
    legacyCategory: "tv-sonarr",
    categoryField: "tvCategory",
    importedCategoryField: "tvImportedCategory",
    unmonitorKey: "autoUnmonitorPreviouslyDownloadedEpisodes",
  },
  {
    name: "lidarr",
    label: "Lidarr",
    port: 8686,
    dir: "music",
    category: "music",
    importedCategory: "music-imported",
    legacyCategory: "lidarr",
    categoryField: "musicCategory",
    importedCategoryField: "musicImportedCategory",
    unmonitorKey: "autoUnmonitorPreviouslyDownloadedTracks",
  },
];

/** Download sub-folders mithrandir manages (current + legacy category folders) */
export const MANAGED_DOWNLOAD_DIRS = ARR_PROFILES.flatMap((p) => [p.dir, p.legacyCategory]);
const LEGACY_DIRS = new Set(ARR_PROFILES.map((p) => p.legacyCategory));

export function getArrProfile(name: ArrName): ArrProfile {
  return ARR_PROFILES.find((p) => p.name === name)!;
}

/** Category fields for a new qBittorrent download client (setup wizards) */
export function downloadClientCategoryFields(
  name: ArrName,
): Array<{ order: number; name: string; label: string; value: string }> {
  const p = getArrProfile(name);
  return [
    { order: 4, name: p.categoryField, label: "Category", value: p.category },
    { order: 5, name: p.importedCategoryField, label: "Post-Import Category", value: p.importedCategory },
  ];
}

export function categorySavePath(profile: ArrProfile): string {
  return `${CONTAINER_DOWNLOADS_ROOT}/${profile.dir}`;
}

/** Map a container path under /data to the host path under BASE_DIR/data */
export function toHostPath(containerPath: string, baseDir: string): string | null {
  const normalized = resolve(containerPath);
  if (normalized !== CONTAINER_DATA_ROOT && !normalized.startsWith(`${CONTAINER_DATA_ROOT}/`)) {
    return null;
  }
  return join(baseDir, "data", normalized.slice(CONTAINER_DATA_ROOT.length));
}

export function getHostDownloadsDir(baseDir: string): string {
  return join(baseDir, "data", "downloads");
}

export function getMediaWebhookUrl(localIp: string): string {
  return `http://${localIp}:${UI_PORT}${MEDIA_WEBHOOK_PATH}`;
}

export function generateWebhookSecret(): string {
  return randomBytes(24).toString("hex");
}

// ─── Generic *arr provider resources ─────────────────────────────────────────

export interface ArrField {
  name: string | null;
  value?: unknown;
  [key: string]: unknown;
}

export interface ArrProviderResource {
  id?: number;
  name?: string | null;
  implementation?: string | null;
  fields?: ArrField[] | null;
  [key: string]: unknown;
}

function getField(resource: ArrProviderResource, name: string): unknown {
  return resource.fields?.find((f) => f.name === name)?.value;
}

function setFields(resource: ArrProviderResource, values: Record<string, unknown>): ArrProviderResource {
  const fields = (resource.fields ?? []).map((f) =>
    f.name !== null && f.name in values ? { ...f, value: values[f.name] } : f,
  );
  return { ...resource, fields };
}

function hasField(resource: ArrProviderResource, name: string): boolean {
  return !!resource.fields?.some((f) => f.name === name);
}

// ─── Pure helpers: download client ───────────────────────────────────────────

/** Human readable differences between a qBittorrent download client and the recommended settings */
export function downloadClientIssues(resource: ArrProviderResource, profile: ArrProfile): string[] {
  const issues: string[] = [];
  const category = getField(resource, profile.categoryField);
  if (category !== profile.category) {
    issues.push(`category is "${category ?? ""}" instead of "${profile.category}"`);
  }
  if (hasField(resource, profile.importedCategoryField)) {
    const imported = getField(resource, profile.importedCategoryField);
    if (imported !== profile.importedCategory) {
      issues.push(`post-import category is "${imported ?? ""}" instead of "${profile.importedCategory}"`);
    }
  }
  if (resource.removeCompletedDownloads === true) {
    issues.push("\"Remove completed\" is on (torrents are removed behind your back once seeding stops)");
  }
  if (resource.removeFailedDownloads === false) {
    issues.push("\"Remove failed\" is off");
  }
  return issues;
}

export interface DownloadClientOptions {
  host?: string;
  port?: number;
  credentials?: { username: string; password: string } | null;
}

/** Return a copy of a qBittorrent download client with the recommended settings applied */
export function applyDownloadClientSettings(
  resource: ArrProviderResource,
  profile: ArrProfile,
  options: DownloadClientOptions = {},
): ArrProviderResource {
  const values: Record<string, unknown> = {
    [profile.categoryField]: profile.category,
    [profile.importedCategoryField]: profile.importedCategory,
  };
  if (options.host) values.host = options.host;
  if (options.port) values.port = options.port;
  if (options.credentials) {
    values.username = options.credentials.username;
    values.password = options.credentials.password;
  }
  return {
    ...setFields(resource, values),
    removeCompletedDownloads: false,
    removeFailedDownloads: true,
  };
}

// ─── Pure helpers: media management ──────────────────────────────────────────

export function mediaManagementIssues(config: Record<string, unknown>, profile: ArrProfile): string[] {
  const issues: string[] = [];
  if (config[profile.unmonitorKey] !== true) {
    issues.push("deleted items stay monitored (they would be downloaded again)");
  }
  if (config.copyUsingHardlinks === false) {
    issues.push("hardlinks are disabled (every import is a full copy)");
  }
  return issues;
}

export function applyMediaManagementSettings<T extends Record<string, unknown>>(
  config: T,
  profile: ArrProfile,
): T {
  return { ...config, [profile.unmonitorKey]: true, copyUsingHardlinks: true };
}

// ─── Pure helpers: webhook ───────────────────────────────────────────────────

/**
 * Event flags the cleanup webhook subscribes to: every delete event (to free
 * space) plus import events (to remember which torrents are hardlinked).
 * Only flags the *arr reports as supported are returned.
 */
export function webhookEventKeys(schema: ArrProviderResource): string[] {
  return Object.keys(schema).filter((key) => {
    if (!key.startsWith("on")) return false;
    if (!/(Delete|Download|Upgrade|ReleaseImport|ImportComplete)/.test(key)) return false;
    // onMovieDelete ↔ supportsOnMovieDelete
    return schema[`supports${key[0].toUpperCase()}${key.slice(1)}`] !== false;
  });
}

export function findCleanupWebhook(notifications: ArrProviderResource[]): ArrProviderResource | undefined {
  return notifications.find(
    (n) =>
      n.implementation === "Webhook" &&
      (n.name === MEDIA_WEBHOOK_NAME || String(getField(n, "url") ?? "").includes(MEDIA_WEBHOOK_PATH)),
  );
}

export function buildCleanupWebhook(
  base: ArrProviderResource,
  schema: ArrProviderResource,
  url: string,
  secret: string,
): ArrProviderResource {
  const resource: ArrProviderResource = {
    ...setFields(base, {
      url,
      method: 1,
      username: MEDIA_WEBHOOK_USERNAME,
      password: secret,
    }),
    name: MEDIA_WEBHOOK_NAME,
    implementation: "Webhook",
    configContract: "WebhookSettings",
    tags: Array.isArray(base.tags) ? base.tags : [],
  };
  delete resource.presets;
  for (const key of webhookEventKeys(schema)) resource[key] = true;
  return resource;
}

export function webhookIssues(
  existing: ArrProviderResource | undefined,
  schema: ArrProviderResource,
  url: string,
): string[] {
  if (!existing) return ["download cleanup webhook is missing"];
  const issues: string[] = [];
  if (getField(existing, "url") !== url) issues.push(`webhook URL is "${getField(existing, "url") ?? ""}" instead of "${url}"`);
  if (getField(existing, "username") !== MEDIA_WEBHOOK_USERNAME) issues.push("webhook username differs");
  const missing = webhookEventKeys(schema).filter((k) => existing[k] !== true);
  if (missing.length > 0) issues.push(`webhook events disabled: ${missing.join(", ")}`);
  return issues;
}

// ─── Pure helpers: qBittorrent ───────────────────────────────────────────────

/** Ratio/seeding-time actions that remove torrents (1 = remove, 3 = remove with files) */
const REMOVING_LIMIT_ACTIONS = new Set([1, 3]);

export function qbittorrentPreferenceIssues(prefs: Partial<QBittorrentPreferences>): string[] {
  const issues: string[] = [];
  const savePath = String(prefs.save_path ?? "").replace(/\/+$/, "");
  if (savePath !== CONTAINER_DOWNLOADS_ROOT) {
    issues.push(`default save path is "${prefs.save_path ?? ""}" instead of "${CONTAINER_DOWNLOADS_ROOT}"`);
  }
  if (prefs.auto_tmm_enabled !== true) {
    issues.push("automatic torrent management is off (categories don't choose the folder)");
  }
  const limitsOn =
    prefs.max_ratio_enabled === true ||
    prefs.max_seeding_time_enabled === true ||
    prefs.max_inactive_seeding_time_enabled === true;
  if (limitsOn && REMOVING_LIMIT_ACTIONS.has(Number(prefs.max_ratio_act))) {
    issues.push("seeding limits automatically remove torrents");
  }
  return issues;
}

export function recommendedQbittorrentPreferences(
  prefs: Partial<QBittorrentPreferences>,
): Partial<QBittorrentPreferences> {
  const update: Partial<QBittorrentPreferences> = {
    save_path: CONTAINER_DOWNLOADS_ROOT,
    auto_tmm_enabled: true,
  };
  // Keep the user's limits but make them stop instead of delete.
  if (REMOVING_LIMIT_ACTIONS.has(Number(prefs.max_ratio_act))) update.max_ratio_act = 0;
  return update;
}

// ─── Pure helpers: classification ────────────────────────────────────────────

const MEDIA_EXTENSIONS = new Set([
  // video
  "mkv", "mp4", "m4v", "avi", "mov", "wmv", "ts", "m2ts", "mpg", "mpeg", "webm", "flv", "vob", "iso",
  // audio
  "flac", "mp3", "m4a", "m4b", "aac", "ogg", "oga", "opus", "wav", "wma", "alac", "ape", "wv", "aiff", "dsf",
]);

/** Video/audio files the *arrs import (samples excluded) */
export function isMediaFile(path: string): boolean {
  const lower = path.toLowerCase();
  const ext = lower.split(".").pop() ?? "";
  if (!MEDIA_EXTENSIONS.has(ext)) return false;
  return !/(^|[\\/._ -])sample([\\/._ -]|$)/.test(lower);
}

export interface LinkedFileInfo {
  path: string;
  size: number;
  /** Hard link count; 0 when the file is missing */
  nlink: number;
}

export type LinkState = "linked" | "partial" | "unlinked" | "empty";

export interface LinkSummary {
  state: LinkState;
  mediaFiles: number;
  linkedMediaFiles: number;
  totalBytes: number;
  /** Bytes freed by deleting these files now (files with no other hard link) */
  reclaimableBytes: number;
}

export function summarizeLinks(files: LinkedFileInfo[]): LinkSummary {
  const present = files.filter((f) => f.nlink > 0);
  let media = present.filter((f) => isMediaFile(f.path));
  // Downloads without recognizable media (e.g. odd extensions): judge on every file.
  if (media.length === 0) media = present;
  const linked = media.filter((f) => f.nlink > 1).length;
  const totalBytes = present.reduce((s, f) => s + f.size, 0);
  const reclaimableBytes = present.filter((f) => f.nlink === 1).reduce((s, f) => s + f.size, 0);
  let state: LinkState;
  if (media.length === 0) state = "empty";
  else if (linked === 0) state = "unlinked";
  else if (linked < media.length) state = "partial";
  else state = "linked";
  return { state, mediaFiles: media.length, linkedMediaFiles: linked, totalBytes, reclaimableBytes };
}

/** Category a torrent from a legacy category should move to */
export function legacyMigrationCategory(profile: ArrProfile, complete: boolean, hasLinks: boolean): string {
  return complete && hasLinks ? profile.importedCategory : profile.category;
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface ArrApi {
  downloadClient: {
    getAll(): Promise<ArrProviderResource[]>;
    getSchema(): Promise<ArrProviderResource[]>;
    create(r: ArrProviderResource, forceSave?: boolean): Promise<ArrProviderResource>;
    update(id: number, r: ArrProviderResource, forceSave?: boolean): Promise<ArrProviderResource>;
  };
  mediaManagement: {
    get(): Promise<Record<string, unknown> & { id?: number }>;
    update(id: number, r: Record<string, unknown>): Promise<unknown>;
  };
  notification: {
    getAll(): Promise<ArrProviderResource[]>;
    getSchema(): Promise<ArrProviderResource[]>;
    create(r: ArrProviderResource, forceSave?: boolean): Promise<ArrProviderResource>;
    update(id: number, r: ArrProviderResource, forceSave?: boolean): Promise<ArrProviderResource>;
  };
}

function isInstalled(name: string, baseDir: string): boolean {
  const app = getApp(name);
  return !!app && existsSync(getComposePath(app, baseDir));
}

/** qBittorrent plus at least one of Radarr/Sonarr/Lidarr is installed */
export function isMediaStackInstalled(baseDir: string): boolean {
  return isInstalled("qbittorrent", baseDir) && ARR_PROFILES.some((p) => isInstalled(p.name, baseDir));
}

async function createArrApi(profile: ArrProfile, baseDir: string): Promise<ArrApi | null> {
  const baseUrl = `http://127.0.0.1:${profile.port}`;
  if (profile.name === "radarr") {
    const apiKey = await getRadarrApiKey(baseDir);
    return apiKey ? (createRadarrClient({ apiKey, baseUrl }) as unknown as ArrApi) : null;
  }
  if (profile.name === "sonarr") {
    const apiKey = await getSonarrApiKey(baseDir);
    return apiKey ? (createSonarrClient({ apiKey, baseUrl }) as unknown as ArrApi) : null;
  }
  const apiKey = await getLidarrApiKey(baseDir);
  return apiKey ? (createLidarrClient({ apiKey, baseUrl }) as unknown as ArrApi) : null;
}

export type CredentialSource = "env" | "provided" | "temporary" | "none";

export interface QbitConnection {
  client: QBittorrentClient | null;
  credentialSource: CredentialSource;
  credentials: { username: string; password: string } | null;
  error?: string;
}

/** Log into qBittorrent with explicit credentials, those in .env, or the temporary first-run password */
export async function connectQbittorrent(
  env: EnvConfig,
  provided?: { username: string; password: string } | null,
): Promise<QbitConnection> {
  const candidates: Array<{ source: CredentialSource; username: string; password: string }> = [];
  if (provided?.username && provided.password) candidates.push({ source: "provided", ...provided });
  if (env.QBITTORRENT_USERNAME && env.QBITTORRENT_PASSWORD) {
    candidates.push({ source: "env", username: env.QBITTORRENT_USERNAME, password: env.QBITTORRENT_PASSWORD });
  }
  if (candidates.length === 0) {
    const temp = await getQBittorrentCredentials(env.BASE_DIR).catch(() => null);
    if (temp) candidates.push({ source: "temporary", username: temp.username, password: temp.password });
  }
  if (candidates.length === 0) {
    return {
      client: null,
      credentialSource: "none",
      credentials: null,
      error: "qBittorrent credentials unknown (set QBITTORRENT_USERNAME / QBITTORRENT_PASSWORD)",
    };
  }

  let lastError = "login failed";
  for (const c of candidates) {
    const client = createQBittorrentClient({ baseUrl: `http://127.0.0.1:${QBITTORRENT_PORT}` });
    try {
      const login = await client.auth.login(c.username, c.password);
      if (login.success) {
        return { client, credentialSource: c.source, credentials: { username: c.username, password: c.password } };
      }
      lastError = login.banned
        ? "qBittorrent temporarily banned this IP after failed logins"
        : `qBittorrent rejected the ${c.source === "env" ? ".env" : c.source} credentials`;
    } catch (err) {
      lastError = `qBittorrent unreachable: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return { client: null, credentialSource: "none", credentials: null, error: lastError };
}

// ─── Settings inspection / fix ───────────────────────────────────────────────

export type IssueSeverity = "fail" | "warn" | "info";

export interface MediaSettingsIssue {
  app: string;
  severity: IssueSeverity;
  message: string;
  /** True when `applyMediaDownloadSettings` fixes it */
  fixable: boolean;
}
interface PlannedAction {
  app: string;
  message: string;
  apply: () => Promise<void>;
}

export interface MediaDownloadsStatus {
  /** qBittorrent and at least one *arr installed */
  relevant: boolean;
  qbittorrentInstalled: boolean;
  arrs: Array<{ name: ArrName; label: string; installed: boolean; reachable: boolean; error?: string }>;
  qbittorrent: { reachable: boolean; credentialSource: CredentialSource; error?: string };
  uiServiceActive: boolean;
  webhookSecretConfigured: boolean;
  webhookUrl: string;
  /** null when one of the folders is missing */
  sameFilesystem: boolean | null;
  issues: MediaSettingsIssue[];
}

interface PlanOptions {
  credentials?: { username: string; password: string } | null;
  /** Fix mode: secret to write into every cleanup webhook */
  secret?: string;
}

interface Plan {
  status: MediaDownloadsStatus;
  actions: PlannedAction[];
  qbit: QbitConnection;
}

async function sameDevice(a: string, b: string): Promise<boolean | null> {
  try {
    const [sa, sb] = await Promise.all([stat(a), stat(b)]);
    return sa.dev === sb.dev;
  } catch {
    return null;
  }
}

async function buildPlan(env: EnvConfig, options: PlanOptions = {}): Promise<Plan> {
  const baseDir = env.BASE_DIR;
  const fixMode = options.secret !== undefined;
  const qbittorrentInstalled = isInstalled("qbittorrent", baseDir);
  const installedProfiles = ARR_PROFILES.filter((p) => isInstalled(p.name, baseDir));
  const relevant = qbittorrentInstalled && installedProfiles.length > 0;
  const localIp = await getLocalIp();
  const webhookUrl = getMediaWebhookUrl(localIp);
  const uiServiceActive = await isUiServiceActive().catch(() => false);
  const issues: MediaSettingsIssue[] = [];
  const actions: PlannedAction[] = [];
  const issue = (app: string, severity: IssueSeverity, message: string, fixable: boolean) =>
    issues.push({ app, severity, message, fixable });
  const action = (app: string, message: string, apply: () => Promise<void>) =>
    actions.push({ app, message, apply });

  const status: MediaDownloadsStatus = {
    relevant,
    qbittorrentInstalled,
    arrs: ARR_PROFILES.map((p) => ({
      name: p.name,
      label: p.label,
      installed: installedProfiles.includes(p),
      reachable: false,
    })),
    qbittorrent: { reachable: false, credentialSource: "none" },
    uiServiceActive,
    webhookSecretConfigured: !!env.MEDIA_WEBHOOK_SECRET,
    webhookUrl,
    sameFilesystem: await sameDevice(getHostDownloadsDir(baseDir), join(baseDir, "data", "media")),
    issues,
  };

  const qbit: QbitConnection = qbittorrentInstalled
    ? await connectQbittorrent(env, options.credentials)
    : { client: null, credentialSource: "none", credentials: null };

  if (!relevant) return { status, actions, qbit };

  if (status.sameFilesystem === false) {
    issue(
      "Storage",
      "fail",
      "data/downloads and data/media are on different filesystems: hardlinks are impossible and every import is a full copy",
      false,
    );
  }
  if (!env.MEDIA_WEBHOOK_SECRET) issue("Webhook", "warn", "MEDIA_WEBHOOK_SECRET is not set", true);

  // ── qBittorrent ───────────────────────────────────────────────────────────
  status.qbittorrent = { reachable: !!qbit.client, credentialSource: qbit.credentialSource, error: qbit.error };
  const qbtClient = qbit.client;
  if (!qbtClient) {
    issue("qBittorrent", "fail", qbit.error ?? "not reachable", false);
  } else {
    if (qbit.credentialSource === "temporary" || qbit.credentialSource === "provided") {
      const creds = qbit.credentials!;
      issue("qBittorrent", "warn", "credentials are not saved in .env (needed for automatic cleanup)", true);
      action("qBittorrent", "save credentials to .env", async () => {
        env.QBITTORRENT_USERNAME = creds.username;
        env.QBITTORRENT_PASSWORD = creds.password;
      });
    }

    const prefs = await qbtClient.app.getPreferences();
    const prefIssues = qbittorrentPreferenceIssues(prefs);
    for (const message of prefIssues) issue("qBittorrent", "warn", message, true);
    if (prefIssues.length > 0) {
      action("qBittorrent", "apply recommended preferences", async () => {
        await qbtClient.app.setPreferences(recommendedQbittorrentPreferences(prefs));
      });
    }

    const categories = await qbtClient.torrents.categories();
    for (const profile of installedProfiles) {
      const savePath = categorySavePath(profile);
      for (const name of [profile.category, profile.importedCategory]) {
        const existing = categories[name];
        if (existing?.savePath?.replace(/\/+$/, "") === savePath) continue;
        issue(
          "qBittorrent",
          "warn",
          existing
            ? `category "${name}" saves to "${existing.savePath || "(default)"}" instead of "${savePath}"`
            : `category "${name}" is missing`,
          true,
        );
        action("qBittorrent", `${existing ? "update" : "create"} category "${name}" → ${savePath}`, async () => {
          if (existing) await qbtClient.torrents.editCategory(name, savePath);
          else await qbtClient.torrents.createCategory(name, savePath);
        });
      }
    }

    // Torrents still filed under the *arr's default category move to the new folders.
    const torrents = await qbtClient.torrents.list();
    for (const profile of installedProfiles) {
      const legacy = torrents.filter((t) => t.category === profile.legacyCategory);
      if (legacy.length > 0) {
        issue(
          "qBittorrent",
          "warn",
          `${legacy.length} torrent(s) in old category "${profile.legacyCategory}" (downloads/${profile.legacyCategory})`,
          true,
        );
        action("qBittorrent", `move ${legacy.length} torrent(s) out of "${profile.legacyCategory}"`, async () => {
          for (const t of legacy) {
            const files = await torrentFileLinks(qbtClient, t, baseDir);
            const target = legacyMigrationCategory(
              profile,
              t.progress >= 1,
              summarizeLinks(files).linkedMediaFiles > 0,
            );
            if (!t.auto_tmm) await qbtClient.torrents.setAutoManagement([t.hash], true);
            await qbtClient.torrents.setCategory([t.hash], target);
          }
        });
      }
      if (categories[profile.legacyCategory]) {
        action("qBittorrent", `remove old category "${profile.legacyCategory}"`, async () => {
          const still = await qbtClient.torrents.list({ category: profile.legacyCategory });
          if (still.length === 0) await qbtClient.torrents.removeCategories([profile.legacyCategory]);
        });
      }
    }
  }

  // ── *arr apps ──────────────────────────────────────────────────────────────
  const credentialsForArr = qbit.credentialSource === "none" ? null : qbit.credentials;

  for (const profile of installedProfiles) {
    const entry = status.arrs.find((a) => a.name === profile.name)!;
    const app = profile.label;
    const api = await createArrApi(profile, baseDir);
    if (!api) {
      entry.error = "API key not found in config.xml";
      issue(app, "fail", entry.error, false);
      continue;
    }

    try {
      // Download client
      const clients = (await api.downloadClient.getAll()).filter((c) => c.implementation === "QBittorrent");
      entry.reachable = true;
      if (clients.length === 0) {
        issue(app, "fail", "no qBittorrent download client", true);
        action(app, "add qBittorrent download client", async () => {
          const schema = (await api.downloadClient.getSchema()).find((s) => s.implementation === "QBittorrent");
          if (!schema) throw new Error("qBittorrent download client schema not found");
          const resource = applyDownloadClientSettings(
            { ...schema, name: "qBittorrent", enable: true, priority: 1, protocol: "torrent" },
            profile,
            { host: localIp, port: QBITTORRENT_PORT, credentials: credentialsForArr },
          );
          delete resource.presets;
          await api.downloadClient.create(resource, true);
        });
      }
      for (const client of clients) {
        const clientIssues = downloadClientIssues(client, profile);
        for (const message of clientIssues) issue(app, "warn", `download client: ${message}`, true);
        const updateCreds = fixMode && credentialsForArr && qbit.credentialSource !== "env";
        if (clientIssues.length > 0 || updateCreds) {
          action(app, `update download client "${client.name}"`, async () => {
            await api.downloadClient.update(
              client.id!,
              applyDownloadClientSettings(client, profile, { credentials: updateCreds ? credentialsForArr : null }),
              true,
            );
          });
        }
      }

      // Media management
      const mm = await api.mediaManagement.get();
      const mmIssues = mediaManagementIssues(mm, profile);
      for (const message of mmIssues) issue(app, "warn", message, true);
      if (mmIssues.length > 0) {
        action(app, "update media management settings", async () => {
          await api.mediaManagement.update(mm.id!, applyMediaManagementSettings(mm, profile));
        });
      }
      if (typeof mm.recycleBin === "string" && mm.recycleBin.trim() !== "") {
        issue(app, "info", `recycle bin is enabled (${mm.recycleBin}): deleted files keep using space until it is emptied`, false);
      }

      // Cleanup webhook
      const notifSchema = (await api.notification.getSchema()).find((s) => s.implementation === "Webhook");
      if (!notifSchema) throw new Error("webhook notification schema not found");
      const existing = findCleanupWebhook(await api.notification.getAll());
      if (!uiServiceActive) {
        issue(
          app,
          existing ? "warn" : "fail",
          "the mithrandir UI service is not running, so deletes cannot free the seeding copy (run `mithrandir ui install`, then `mithrandir media fix`)",
          false,
        );
        continue;
      }
      const hookIssues = webhookIssues(existing, notifSchema, webhookUrl);
      for (const message of hookIssues) issue(app, existing ? "warn" : "fail", message, true);
      if (hookIssues.length > 0 || fixMode) {
        action(app, existing ? "update download cleanup webhook" : "add download cleanup webhook", async () => {
          const webhookSecret = options.secret ?? env.MEDIA_WEBHOOK_SECRET;
          if (!webhookSecret) throw new Error("MEDIA_WEBHOOK_SECRET is not set");
          const resource = buildCleanupWebhook(existing ?? notifSchema, notifSchema, webhookUrl, webhookSecret);
          if (existing?.id) await api.notification.update(existing.id, resource, true);
          else await api.notification.create(resource, true);
        });
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err);
      issue(app, "fail", `not reachable: ${entry.error}`, false);
    }
  }

  return { status, actions, qbit };
}

/** Inspect settings without changing anything */
export async function inspectMediaDownloads(env: EnvConfig): Promise<MediaDownloadsStatus> {
  return (await buildPlan(env)).status;
}

export interface ApplyStepResult {
  app: string;
  message: string;
  ok: boolean;
  error?: string;
}

export interface ApplyMediaSettingsResult {
  steps: ApplyStepResult[];
  /** Issues that remain after applying (not auto-fixable, or failed) */
  remaining: MediaSettingsIssue[];
  envUpdated: boolean;
}

export interface ApplyMediaSettingsOptions {
  /** qBittorrent WebUI credentials to use (and save to .env) */
  credentials?: { username: string; password: string } | null;
  projectRoot?: string;
}

/** Apply every recommended setting. Never deletes torrents or files. */
export async function applyMediaDownloadSettings(
  env: EnvConfig,
  options: ApplyMediaSettingsOptions = {},
): Promise<ApplyMediaSettingsResult> {
  const steps: ApplyStepResult[] = [];
  let envUpdated = false;
  const secret = env.MEDIA_WEBHOOK_SECRET ?? generateWebhookSecret();

  const plan = await buildPlan(env, { credentials: options.credentials, secret });
  if (!plan.status.relevant) {
    return { steps, remaining: plan.status.issues, envUpdated };
  }

  if (!env.MEDIA_WEBHOOK_SECRET) {
    env.MEDIA_WEBHOOK_SECRET = secret;
    envUpdated = true;
    steps.push({ app: "Webhook", message: "generated MEDIA_WEBHOOK_SECRET", ok: true });
  }

  const before = { user: env.QBITTORRENT_USERNAME, pass: env.QBITTORRENT_PASSWORD };
  for (const action of plan.actions) {
    try {
      await action.apply();
      steps.push({ app: action.app, message: action.message, ok: true });
    } catch (err) {
      steps.push({
        app: action.app,
        message: action.message,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (env.QBITTORRENT_USERNAME !== before.user || env.QBITTORRENT_PASSWORD !== before.pass) {
    envUpdated = true;
  }
  if (envUpdated) await saveEnvConfig(env, options.projectRoot);

  // The webhook runs in a container and calls the UI on the host.
  if (env.ENABLE_FIREWALL === "true" && plan.status.uiServiceActive) {
    try {
      await allowDockerToHostPort(UI_PORT);
      steps.push({ app: "Firewall", message: `allow Docker containers to reach the UI (port ${UI_PORT})`, ok: true });
    } catch (err) {
      steps.push({
        app: "Firewall",
        message: `allow Docker containers to reach the UI (port ${UI_PORT})`,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Remember torrents that are currently hardlinked into the library.
  if (plan.qbit.client) {
    await scanDownloads(env, { client: plan.qbit.client, includeOrphans: false }).catch(() => undefined);
  }

  const after = await buildPlan(env);
  return { steps, remaining: after.status.issues.filter((i) => i.severity !== "info"), envUpdated };
}

/** Firewall: let the *arr containers reach the UI webhook (no-op unless the webhook is configured) */
export async function allowMediaWebhookTraffic(env: EnvConfig): Promise<void> {
  if (env.MEDIA_WEBHOOK_SECRET) await allowDockerToHostPort(UI_PORT);
}

// ─── Downloads scan ──────────────────────────────────────────────────────────

async function fileLink(path: string): Promise<LinkedFileInfo> {
  try {
    const s = await lstat(path);
    return { path, size: s.size, nlink: s.nlink };
  } catch {
    return { path, size: 0, nlink: 0 };
  }
}

async function torrentFileLinks(
  client: QBittorrentClient,
  torrent: QBittorrentTorrent,
  baseDir: string,
): Promise<LinkedFileInfo[]> {
  const files = await client.torrents.files(torrent.hash);
  const out: LinkedFileInfo[] = [];
  for (const f of files) {
    const host = toHostPath(join(torrent.save_path, f.name), baseDir);
    if (host) out.push(await fileLink(host));
  }
  return out;
}

async function walkFiles(path: string): Promise<LinkedFileInfo[]> {
  const s = await lstat(path).catch(() => null);
  if (!s) return [];
  if (s.isFile()) return [{ path, size: s.size, nlink: s.nlink }];
  if (!s.isDirectory()) return [];
  const entries = await readdir(path).catch(() => [] as string[]);
  const nested = await Promise.all(entries.map((e) => walkFiles(join(path, e))));
  return nested.flat();
}

async function latestMtime(path: string): Promise<number> {
  const s = await lstat(path).catch(() => null);
  if (!s) return 0;
  let latest = s.mtimeMs;
  if (s.isDirectory()) {
    const entries = await readdir(path).catch(() => [] as string[]);
    for (const e of entries) latest = Math.max(latest, await latestMtime(join(path, e)));
  }
  return latest;
}

export type TorrentGroup =
  /** Library copy deleted in an *arr — safe to remove */
  | "deleted"
  /** Some files of a pack were deleted from the library, others are still used */
  | "partial"
  /** Completed but never imported into the library */
  | "not-imported";

export interface DownloadTorrentItem {
  hash: string;
  name: string;
  category: string;
  state: string;
  group: TorrentGroup;
  /** Removed automatically by the webhook (imported + previously seen hardlinked) */
  autoCleanup: boolean;
  totalBytes: number;
  reclaimableBytes: number;
  mediaFiles: number;
  linkedMediaFiles: number;
  completedOn?: number;
}

export interface DownloadOrphanItem {
  /** Absolute host path */
  path: string;
  /** Path relative to data/downloads */
  relativePath: string;
  totalBytes: number;
  reclaimableBytes: number;
  /** Still hardlinked into the library (removing frees space only once the library copy is deleted) */
  linked: boolean;
}

export interface DownloadsScan {
  torrents: DownloadTorrentItem[];
  orphans: DownloadOrphanItem[];
  /** Torrents in managed folders that are fine (hardlinked or still downloading) */
  healthyCount: number;
  reclaimableBytes: number;
  /** Orphans are not listed when qBittorrent could not be queried */
  orphansScanned: boolean;
  error?: string;
}

export interface ScanOptions {
  client?: QBittorrentClient | null;
  includeOrphans?: boolean;
}

function isManagedSavePath(savePath: string): boolean {
  const normalized = resolve(savePath);
  return MANAGED_DOWNLOAD_DIRS.some(
    (d) => normalized === `${CONTAINER_DOWNLOADS_ROOT}/${d}` || normalized.startsWith(`${CONTAINER_DOWNLOADS_ROOT}/${d}/`),
  );
}

const IMPORTED_CATEGORIES = new Set(ARR_PROFILES.map((p) => p.importedCategory));

/**
 * Classify downloads by hard link count. Tags torrents that are hardlinked
 * into the library with LINKED_TAG so later webhook cleanups can tell
 * "deleted from the library" apart from "copied instead of linked".
 */
export async function scanDownloads(env: EnvConfig, options: ScanOptions = {}): Promise<DownloadsScan> {
  const baseDir = env.BASE_DIR;
  const includeOrphans = options.includeOrphans ?? true;
  const client = options.client ?? (await connectQbittorrent(env)).client;
  const result: DownloadsScan = {
    torrents: [],
    orphans: [],
    healthyCount: 0,
    reclaimableBytes: 0,
    orphansScanned: false,
  };
  if (!client) {
    result.error = "qBittorrent is not reachable or credentials are unknown";
    return result;
  }

  const torrents = (await client.torrents.list()).filter((t) => isManagedSavePath(t.save_path));
  const ownedEntries = new Set<string>();
  const newlyLinked: string[] = [];
  const downloadsDir = getHostDownloadsDir(baseDir);

  for (const t of torrents) {
    const files = await client.torrents.files(t.hash);
    const links: LinkedFileInfo[] = [];
    for (const f of files) {
      const host = toHostPath(join(t.save_path, f.name), baseDir);
      if (!host) continue;
      const rel = relative(downloadsDir, host).split("/");
      // "<category dir>/<top-level entry>" owns everything below it
      if (rel.length >= 2) ownedEntries.add(join(downloadsDir, rel[0], rel[1]));
      links.push(await fileLink(host));
    }
    if (t.progress < 1) {
      result.healthyCount++;
      continue;
    }
    const summary = summarizeLinks(links);
    const tags = (t.tags ?? "").split(",").map((s) => s.trim());
    const tagged = tags.includes(LINKED_TAG);
    if (summary.linkedMediaFiles > 0 && !tagged) newlyLinked.push(t.hash);
    if (summary.state === "linked") {
      result.healthyCount++;
      continue;
    }
    if (summary.state === "empty") continue;
    const imported = IMPORTED_CATEGORIES.has(t.category);
    const group: TorrentGroup =
      summary.state === "partial" ? "partial" : imported || tagged ? "deleted" : "not-imported";
    result.torrents.push({
      hash: t.hash,
      name: t.name,
      category: t.category,
      state: t.state,
      group,
      autoCleanup: group === "deleted" && imported && tagged,
      totalBytes: summary.totalBytes,
      reclaimableBytes: summary.reclaimableBytes,
      mediaFiles: summary.mediaFiles,
      linkedMediaFiles: summary.linkedMediaFiles,
      completedOn: typeof t.completion_on === "number" && t.completion_on > 0 ? t.completion_on : undefined,
    });
  }

  if (newlyLinked.length > 0) {
    await client.torrents.addTags(newlyLinked, LINKED_TAG).catch(() => undefined);
  }

  if (includeOrphans) {
    const now = Date.now();
    for (const dir of MANAGED_DOWNLOAD_DIRS) {
      const dirPath = join(downloadsDir, dir);
      const entries = await readdir(dirPath).catch(() => [] as string[]);
      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "incomplete" || entry.endsWith(".!qB") || entry.endsWith(".parts")) {
          continue;
        }
        const full = join(dirPath, entry);
        if (ownedEntries.has(full)) continue;
        if (now - (await latestMtime(full)) < ORPHAN_MIN_AGE_MS) continue;
        const files = await walkFiles(full);
        const totalBytes = files.reduce((s, f) => s + f.size, 0);
        const reclaimableBytes = files.filter((f) => f.nlink === 1).reduce((s, f) => s + f.size, 0);
        result.orphans.push({
          path: full,
          relativePath: join(dir, entry),
          totalBytes,
          reclaimableBytes,
          linked: files.some((f) => f.nlink > 1),
        });
      }
    }
    result.orphansScanned = true;
  }

  result.torrents.sort((a, b) => b.reclaimableBytes - a.reclaimableBytes);
  result.orphans.sort((a, b) => b.reclaimableBytes - a.reclaimableBytes || a.relativePath.localeCompare(b.relativePath));
  result.reclaimableBytes =
    result.torrents.reduce((s, t) => s + t.reclaimableBytes, 0) +
    result.orphans.reduce((s, o) => s + o.reclaimableBytes, 0);
  return result;
}

// ─── Prune (explicit, user-confirmed) ────────────────────────────────────────

export interface PruneSelection {
  /** Torrent hashes to remove together with their files */
  hashes: string[];
  /** Absolute host paths of orphaned entries to delete */
  orphanPaths: string[];
}

export interface PruneResult {
  removedTorrents: DownloadTorrentItem[];
  deletedOrphans: DownloadOrphanItem[];
  failed: Array<{ target: string; error: string }>;
  freedBytes: number;
  removedDirs: string[];
}

export interface PruneOptions {
  /** Retry failed orphan deletions with `sudo rm` (CLI only) */
  sudoFallback?: boolean;
}

/**
 * Delete the selected leftovers. Only items present in a fresh scan are
 * accepted, so a stale selection can never delete something that is in use.
 */
export async function pruneDownloads(
  env: EnvConfig,
  selection: PruneSelection,
  options: PruneOptions = {},
): Promise<PruneResult> {
  const qbit = await connectQbittorrent(env);
  const result: PruneResult = { removedTorrents: [], deletedOrphans: [], failed: [], freedBytes: 0, removedDirs: [] };
  if (!qbit.client) {
    result.failed.push({ target: "qBittorrent", error: qbit.error ?? "not reachable" });
    return result;
  }
  const scan = await scanDownloads(env, { client: qbit.client, includeOrphans: selection.orphanPaths.length > 0 });

  const wanted = new Set(selection.hashes);
  const torrents = scan.torrents.filter((t) => wanted.has(t.hash));
  for (const hash of selection.hashes) {
    if (!torrents.some((t) => t.hash === hash)) {
      result.failed.push({ target: hash, error: "no longer eligible (in use or already removed)" });
    }
  }
  if (torrents.length > 0) {
    try {
      await qbit.client.torrents.delete(torrents.map((t) => t.hash), true);
      result.removedTorrents = torrents;
      result.freedBytes += torrents.reduce((s, t) => s + t.reclaimableBytes, 0);
    } catch (err) {
      result.failed.push({ target: "qBittorrent", error: err instanceof Error ? err.message : String(err) });
    }
  }

  const wantedPaths = new Set(selection.orphanPaths.map((p) => resolve(p)));
  const orphans = scan.orphans.filter((o) => wantedPaths.has(o.path));
  for (const p of wantedPaths) {
    if (!orphans.some((o) => o.path === p)) result.failed.push({ target: p, error: "not an orphaned download" });
  }
  if (orphans.length > 0) {
    const downloadsDir = getHostDownloadsDir(env.BASE_DIR);
    const deleted = await deletePaths(orphans.map((o) => o.path), downloadsDir);
    const deletedSet = new Set(deleted.deleted);
    for (const f of deleted.failed) {
      if (options.sudoFallback && resolve(f.path).startsWith(`${downloadsDir}/`)) {
        const res = await shell("rm", ["-rf", "--", resolve(f.path)], { sudo: true, ignoreError: true });
        if (res.exitCode === 0) {
          deletedSet.add(resolve(f.path));
          continue;
        }
      }
      result.failed.push({ target: f.path, error: f.error });
    }
    result.deletedOrphans = orphans.filter((o) => deletedSet.has(o.path));
    result.freedBytes += result.deletedOrphans.reduce((s, o) => s + o.reclaimableBytes, 0);
  }

  result.removedDirs = await removeEmptyLegacyDirs(env.BASE_DIR);
  return result;
}

/** Remove downloads/<legacy category> folders once nothing is left in them */
async function removeEmptyLegacyDirs(baseDir: string): Promise<string[]> {
  const removed: string[] = [];
  for (const dir of LEGACY_DIRS) {
    const path = join(getHostDownloadsDir(baseDir), dir);
    if (await removeIfEmpty(path)) removed.push(path);
  }
  return removed;
}

async function removeIfEmpty(path: string): Promise<boolean> {
  const s = await lstat(path).catch(() => null);
  if (!s?.isDirectory()) return false;
  const entries = await readdir(path).catch(() => null);
  if (!entries) return false;
  for (const e of entries) await removeIfEmpty(join(path, e));
  const remaining = await readdir(path).catch(() => ["?"]);
  if (remaining.length > 0) return false;
  try {
    await rmdir(path);
    return true;
  } catch {
    return false;
  }
}

// ─── Webhook-driven cleanup ──────────────────────────────────────────────────

export interface AutoCleanupResult {
  removed: DownloadTorrentItem[];
  /** Deleted-from-library torrents left for manual review (packs, never tagged as linked) */
  skipped: DownloadTorrentItem[];
  error?: string;
}

/**
 * Called after an *arr reports a delete (or import). Removes only torrents
 * that the *arr imported, that mithrandir has seen hardlinked into the
 * library, and that no longer have any file in the library.
 */
export async function cleanupDeletedDownloads(env: EnvConfig): Promise<AutoCleanupResult> {
  const qbit = await connectQbittorrent(env);
  if (!qbit.client) return { removed: [], skipped: [], error: qbit.error };
  const scan = await scanDownloads(env, { client: qbit.client, includeOrphans: false });
  const removable = scan.torrents.filter((t) => t.autoCleanup);
  const skipped = scan.torrents.filter((t) => !t.autoCleanup && t.group !== "not-imported");
  if (removable.length === 0) return { removed: [], skipped };
  await qbit.client.torrents.delete(removable.map((t) => t.hash), true);
  return { removed: removable, skipped };
}

// ─── Doctor ──────────────────────────────────────────────────────────────────

export interface MediaDoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  hint?: string;
}

/** Checks shared by `mithrandir doctor` and the UI doctor. Empty when the media stack isn't installed. */
export async function getMediaDoctorChecks(env: EnvConfig): Promise<MediaDoctorCheck[]> {
  if (!isMediaStackInstalled(env.BASE_DIR)) return [];
  const status = await inspectMediaDownloads(env);
  const checks: MediaDoctorCheck[] = [];

  const problems = status.issues.filter((i) => i.severity !== "info");
  const fails = problems.filter((i) => i.severity === "fail");
  const fixable = problems.some((i) => i.fixable);
  checks.push(
    problems.length === 0
      ? { name: "Download settings", status: "pass", message: "Categories, hardlinks and cleanup webhook configured" }
      : {
          name: "Download settings",
          status: fails.length > 0 ? "fail" : "warn",
          message:
            problems.length === 1
              ? `${problems[0].app}: ${problems[0].message}`
              : `${problems.length} issues (${problems[0].app}: ${problems[0].message}, ...)`,
          hint: fixable
            ? "Run `mithrandir media fix` (or Media → Downloads → Apply recommended settings in the UI)"
            : "Run `mithrandir media` for details",
        },
  );

  if (status.qbittorrent.reachable) {
    const scan = await scanDownloads(env).catch(() => null);
    if (scan && !scan.error) {
      const count = scan.torrents.length + scan.orphans.length;
      checks.push(
        count === 0
          ? { name: "Unused downloads", status: "pass", message: "Every download is in use by the library" }
          : {
              name: "Unused downloads",
              status: "warn",
              message: `${count} item(s) not used by the library, ${formatBytes(scan.reclaimableBytes)} reclaimable`,
              hint: "Review with `mithrandir media prune` (or Media → Downloads in the UI)",
            },
      );
    }
  }
  return checks;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}
