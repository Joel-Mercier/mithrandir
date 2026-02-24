import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { execa } from "execa";

// ---------------------------------------------------------------------------
// Types (subset of qBittorrent 5.0 WebUI API)
// ---------------------------------------------------------------------------

export interface QBittorrentPreferences {
  // Downloads
  locale?: string;
  create_subfolder_enabled?: boolean;
  start_paused_enabled?: boolean;
  auto_delete_mode?: number;
  preallocate_all?: boolean;
  incomplete_files_ext?: boolean;
  auto_tmm_enabled?: boolean;
  torrent_changed_tmm_enabled?: boolean;
  save_path_changed_tmm_enabled?: boolean;
  category_changed_tmm_enabled?: boolean;
  save_path?: string;
  temp_path_enabled?: boolean;
  temp_path?: string;
  use_subcategories?: boolean;
  export_dir?: string;
  export_dir_fin?: string;

  // Seeding limits
  max_ratio_enabled?: boolean;
  max_ratio?: number;
  max_ratio_act?: number;
  max_seeding_time_enabled?: boolean;
  max_seeding_time?: number;
  max_inactive_seeding_time_enabled?: boolean;
  max_inactive_seeding_time?: number;

  // Email notifications
  mail_notification_enabled?: boolean;
  mail_notification_sender?: string;
  mail_notification_email?: string;
  mail_notification_smtp?: string;
  mail_notification_ssl_enabled?: boolean;
  mail_notification_auth_enabled?: boolean;
  mail_notification_username?: string;
  mail_notification_password?: string;

  // Run external program
  autorun_on_torrent_added_enabled?: boolean;
  autorun_on_torrent_added_program?: string;
  autorun_enabled?: boolean;
  autorun_program?: string;

  // Connection
  listen_port?: number;
  upnp?: boolean;
  random_port?: boolean;
  dl_limit?: number;
  up_limit?: number;
  max_connec?: number;
  max_connec_per_torrent?: number;
  max_uploads?: number;
  max_uploads_per_torrent?: number;
  stop_tracker_timeout?: number;
  enable_piece_log?: boolean;
  enable_coalesce_read_write?: boolean;
  outgoing_ports_min?: number;
  outgoing_ports_max?: number;
  upnp_lease_duration?: number;
  peer_tos?: number;
  utp_tcp_mixed_mode?: number;
  idn_support_enabled?: boolean;
  enable_multi_connections_from_same_ip?: boolean;
  validate_https_tracker_certificate?: boolean;
  ssrf_mitigation?: boolean;
  block_peers_on_privileged_ports?: boolean;
  enable_embedded_tracker?: boolean;
  embedded_tracker_port?: number;
  embedded_tracker_port_forwarding?: boolean;
  upload_choking_algorithm?: number;
  upload_slots_behavior?: number;
  upload_slots_in_use?: number;
  enable_super_seeding?: boolean;

  // BitTorrent
  anonymous_mode?: boolean;
  encryption?: number;
  is_dht_enabled?: boolean;
  is_pex_enabled?: boolean;
  is_lsd_enabled?: boolean;
  announce_ip?: string;
  announce_to_all_tiers?: boolean;
  announce_to_all_trackers?: boolean;
  add_trackers_enabled?: boolean;
  add_trackers?: string;

  // Proxy
  proxy_type?: number;
  proxy_hostname?: string;
  proxy_port?: number;
  proxy_auth_enabled?: boolean;
  proxy_username?: string;
  proxy_password?: string;
  proxy_bittorrent?: boolean;
  proxy_peer_connections?: boolean;
  proxy_rss?: boolean;
  proxy_misc?: boolean;

  // IP filter
  ip_filter_enabled?: boolean;
  ip_filter_path?: string;
  ip_filter_trackers?: boolean;
  banned_ips?: string;

  // Speed scheduler
  scheduler_enabled?: boolean;
  schedule_from_hour?: number;
  schedule_from_min?: number;
  schedule_to_hour?: number;
  schedule_to_min?: number;
  scheduler_days?: number;
  alt_dl_limit?: number;
  alt_up_limit?: number;

  // WebUI
  web_ui_domain_list?: string;
  web_ui_address?: string;
  web_ui_port?: number;
  web_ui_upnp?: boolean;
  web_ui_username?: string;
  web_ui_password?: string;
  web_ui_csrf_protection_enabled?: boolean;
  web_ui_clickjacking_protection_enabled?: boolean;
  web_ui_secure_cookie_enabled?: boolean;
  web_ui_max_auth_fail_count?: number;
  web_ui_ban_duration?: number;
  web_ui_session_timeout?: number;
  web_ui_host_header_validation_enabled?: boolean;
  bypass_local_auth?: boolean;
  bypass_auth_subnet_whitelist_enabled?: boolean;
  bypass_auth_subnet_whitelist?: string;
  alternative_webui_enabled?: boolean;
  alternative_webui_path?: string;
  use_https?: boolean;
  web_ui_https_cert_path?: string;
  web_ui_https_key_path?: string;
  web_ui_use_custom_http_headers_enabled?: boolean;
  web_ui_custom_http_headers?: string;

  // Dynamic DNS
  dyndns_enabled?: boolean;
  dyndns_scheme?: number;
  dyndns_domain?: string;
  dyndns_username?: string;
  dyndns_password?: string;

  // RSS
  rss_refresh_interval?: number;
  rss_max_articles_per_feed?: number;
  rss_processing_enabled?: boolean;
  rss_auto_downloading_enabled?: boolean;
  rss_download_repack_proper_episodes?: boolean;
  rss_smart_episode_filters?: string;

  // Disk/performance
  async_io_threads?: number;
  hashing_threads?: number;
  file_pool_size?: number;
  checking_memory_use?: number;
  disk_cache?: number;
  disk_cache_ttl?: number;
  disk_io_read_mode?: number;
  disk_io_write_mode?: number;
  disk_queue_size?: number;
  enable_os_cache?: boolean;
  enable_upload_suggestions?: boolean;
  send_buffer_watermark?: number;
  send_buffer_low_watermark?: number;
  send_buffer_watermark_factor?: number;
  socket_recv_buffer_size?: number;
  socket_send_buffer_size?: number;
  socket_backlog_size?: number;
  save_resume_data_interval?: number;

  // Network interface
  network_interface?: string;
  network_interface_address?: string;
  current_network_interface?: string;
  current_interface_address?: string;

  // Logging
  file_log_enabled?: boolean;
  file_log_path?: string;
  file_log_backup_enabled?: boolean;
  file_log_delete_old?: boolean;
  file_log_max_size?: number;
  file_log_age?: number;
  file_log_age_type?: number;

  // Catch-all for fields not explicitly typed above
  [key: string]: unknown;
}

export interface LoginResult {
  success: boolean;
  /** Session ID cookie value — store and pass to createQBittorrentClient */
  sid?: string;
  /** True when the IP has been banned due to too many failed login attempts */
  banned?: boolean;
}

// ---------------------------------------------------------------------------
// Default credential retrieval
// ---------------------------------------------------------------------------

export interface QBittorrentCredentials {
  username: string;
  password: string;
  /** True when this is the per-session temporary password, not a user-set one. */
  isTemporary: boolean;
}

/**
 * Retrieve qBittorrent WebUI credentials after first container start.
 *
 * Strategy:
 *  1. Read `WebUI\Username` from qBittorrent.conf (defaults to "admin").
 *     The PBKDF2 password hash stored there is not useful — it's encrypted and
 *     may be written for both the temp password and user-set passwords.
 *  2. Parse container logs for the temporary password line that
 *     linuxserver/qbittorrent only prints when no password has been configured.
 *     Once the user sets their own password via the WebUI, this line no longer
 *     appears on subsequent starts, so the log is the authoritative signal.
 *
 * Returns null when the container hasn't started yet, the log line is absent
 * (user already set their own password), or docker is unavailable.
 */
export async function getQBittorrentCredentials(
  baseDir: string,
  containerName = "qbittorrent",
): Promise<QBittorrentCredentials | null> {
  const confPath = join(
    baseDir,
    "qbittorrent",
    "config",
    "qBittorrent",
    "qBittorrent.conf",
  );

  let username = "admin";

  if (existsSync(confPath)) {
    try {
      const conf = await readFile(confPath, "utf-8");
      const userMatch = conf.match(/^WebUI\\Username=(.+)$/m);
      if (userMatch) username = userMatch[1].trim();
    } catch {
      // Unreadable config — fall through with default username.
    }
  }

  // The temp password only lives in the container logs. qBittorrent only emits
  // this line when no password is configured, so its absence means the user has
  // already set their own (which we cannot recover from the encrypted conf).
  try {
    const result = await execa("docker", ["logs", containerName], {
      reject: false,
    });
    const logs = `${result.stdout}\n${result.stderr}`;
    const match = logs.match(
      /A temporary password is provided for this session: (\S+)/,
    );
    if (match) {
      return { username, password: match[1].trim(), isTemporary: true };
    }
  } catch {
    // docker unavailable or container not found.
  }

  return null;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface QBittorrentClientOptions {
  /** Base URL of the qBittorrent WebUI (default: http://localhost:8080) */
  baseUrl?: string;
  /**
   * Session ID from a prior login. Pass this after calling auth.login() to
   * reuse an existing session across client instances.
   */
  sid?: string;
}

export function createQBittorrentClient(options: QBittorrentClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? "http://localhost:8080").replace(/\/$/, "");

  // Mutable session state — updated by auth.login()
  let sid: string | undefined = options.sid;

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  async function request<T>(
    method: string,
    path: string,
    body?: URLSearchParams,
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {};

    if (sid) headers["Cookie"] = `SID=${sid}`;
    if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";

    const res = await fetch(url, {
      method,
      headers,
      body: body?.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `qBittorrent API ${method} ${path} → ${res.status} ${res.statusText}: ${text}`,
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }

    // Plain-text responses (e.g. "Ok.")
    const text = await res.text();
    return text as unknown as T;
  }

  const get = <T>(path: string) => request<T>("GET", path);
  const post = <T>(path: string, body?: URLSearchParams) =>
    request<T>("POST", path, body);

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  return {
    // -----------------------------------------------------------------------
    // Authentication  /api/v2/auth
    // -----------------------------------------------------------------------
    auth: {
      /**
       * Log in and obtain a session ID.
       *
       * On success the SID is stored internally and returned so callers can
       * persist it. Returns `{ success: false, banned: true }` when the IP is
       * temporarily banned after repeated failures.
       */
      login: async (username: string, password: string): Promise<LoginResult> => {
        const body = new URLSearchParams({ username, password });
        const url = `${baseUrl}/api/v2/auth/login`;

        let res: Response;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              // Required by qBittorrent CSRF protection
              Referer: baseUrl,
              Origin: baseUrl,
            },
            body: body.toString(),
          });
        } catch (err) {
          throw new Error(`qBittorrent login request failed: ${err}`);
        }

        if (res.status === 403) return { success: false, banned: true };
        if (!res.ok) return { success: false };

        const text = (await res.text()).trim();
        if (text !== "Ok.") return { success: false };

        // Extract SID from Set-Cookie header
        const setCookie = res.headers.get("set-cookie") ?? "";
        const match = setCookie.match(/\bSID=([^;]+)/);
        if (match) {
          sid = match[1];
          return { success: true, sid };
        }

        return { success: false };
      },

      /** Log out and invalidate the current session. */
      logout: () => post<string>("/api/v2/auth/logout"),
    },

    // -----------------------------------------------------------------------
    // Application  /api/v2/app
    // -----------------------------------------------------------------------
    app: {
      /** Get all application preferences. */
      getPreferences: () => get<QBittorrentPreferences>("/api/v2/app/preferences"),

      /**
       * Update one or more application preferences.
       * Only the supplied keys are modified; omitted keys are left unchanged.
       */
      setPreferences: (prefs: Partial<QBittorrentPreferences>) =>
        post<string>(
          "/api/v2/app/setPreferences",
          new URLSearchParams({ json: JSON.stringify(prefs) }),
        ),
    },

    /** Return the current session ID (undefined if not logged in). */
    getSid: () => sid,
  };
}

export type QBittorrentClient = ReturnType<typeof createQBittorrentClient>;
