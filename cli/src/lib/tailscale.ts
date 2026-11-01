/**
 * Tailscale integration — installs Tailscale on the host and joins it to the
 * user's tailnet so the homelab can be reached remotely without port forwarding.
 *
 * Tailscale runs on the host (not in Docker) so it can act as a subnet router,
 * offer Tailscale SSH, and reach host-networked apps.
 */
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { commandExists, shell } from "@/lib/shell.js";
import { detectDistro } from "@/lib/distro.js";
import type { EnvConfig } from "@/types.js";

export const TAILSCALE_ADMIN_URL = "https://login.tailscale.com/admin/machines";
export const TAILSCALE_KEYS_URL = "https://login.tailscale.com/admin/settings/keys";
export const TAILSCALE_DOWNLOAD_URL = "https://tailscale.com/download";
export const TAILSCALE_INTERFACE = "tailscale0";
export const TAILSCALE_UDP_PORT = 41641;
export const TAILSCALE_SYSCTL_PATH = "/etc/sysctl.d/99-tailscale.conf";
export const DEFAULT_TAILSCALE_HOSTNAME = "mithrandir";

const KEYRING_PATH = "/usr/share/keyrings/tailscale-archive-keyring.gpg";
const SOURCES_PATH = "/etc/apt/sources.list.d/tailscale.list";
const INSTALL_SCRIPT_URL = "https://tailscale.com/install.sh";

// ─── Settings ────────────────────────────────────────────────────────────────

export interface TailscaleSettings {
  /** Device name in the tailnet (MagicDNS machine name) */
  hostname: string;
  /** Subnets shared with the tailnet (subnet router), e.g. ["192.168.1.0/24"] */
  advertiseRoutes: string[];
  /** Offer this server as an exit node */
  exitNode: boolean;
  /** Run the Tailscale SSH server */
  ssh: boolean;
}

/**
 * Parse TAILSCALE_ADVERTISE_ROUTES.
 * - unset / "auto" → detect the LAN subnet
 * - "none" / "false" → don't advertise anything
 * - otherwise a comma-separated list of CIDRs
 */
export function parseRoutesSetting(value: string | undefined): "auto" | string[] {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "" || v === "auto") return "auto";
  if (v === "none" || v === "false" || v === "off") return [];
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Basic CIDR validation (IPv4 a.b.c.d/n or IPv6 x::y/n) */
export function isValidCidr(cidr: string): boolean {
  const [addr, prefix, ...rest] = cidr.split("/");
  if (rest.length > 0 || !addr || prefix === undefined || !/^\d{1,3}$/.test(prefix)) return false;
  const bits = Number(prefix);
  if (addr.includes(":")) {
    return bits <= 128 && /^[0-9a-fA-F:]+$/.test(addr);
  }
  const octets = addr.split(".");
  return (
    bits <= 32 &&
    octets.length === 4 &&
    octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255)
  );
}

/** Turn arbitrary input into a valid DNS label for the device name */
export function sanitizeHostname(name: string | undefined): string {
  const cleaned = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63)
    .replace(/-$/, "");
  return cleaned || DEFAULT_TAILSCALE_HOSTNAME;
}

/** Resolve the effective settings from .env, detecting the LAN subnet when routes are "auto" */
export async function resolveTailscaleSettings(env: EnvConfig): Promise<TailscaleSettings> {
  const routesSetting = parseRoutesSetting(env.TAILSCALE_ADVERTISE_ROUTES);
  let advertiseRoutes: string[];
  if (routesSetting === "auto") {
    const lan = await detectLanSubnet();
    advertiseRoutes = lan ? [lan] : [];
  } else {
    advertiseRoutes = routesSetting.filter(isValidCidr);
  }
  return {
    hostname: sanitizeHostname(env.TAILSCALE_HOSTNAME),
    advertiseRoutes,
    exitNode: env.TAILSCALE_EXIT_NODE === "true",
    ssh: env.TAILSCALE_SSH === "true",
  };
}

/**
 * Write settings to an EnvConfig (mutates and returns it).
 * When `detectedLan` matches the advertised routes, "auto" is stored so the
 * route follows the LAN if it changes.
 */
export function applyTailscaleSettingsToEnv(
  env: EnvConfig,
  settings: TailscaleSettings,
  detectedLan?: string | null,
): EnvConfig {
  env.ENABLE_TAILSCALE = "true";
  env.TAILSCALE_HOSTNAME = settings.hostname;
  if (settings.advertiseRoutes.length === 0) {
    env.TAILSCALE_ADVERTISE_ROUTES = "none";
  } else if (
    detectedLan &&
    settings.advertiseRoutes.length === 1 &&
    settings.advertiseRoutes[0] === detectedLan
  ) {
    env.TAILSCALE_ADVERTISE_ROUTES = "auto";
  } else {
    env.TAILSCALE_ADVERTISE_ROUTES = settings.advertiseRoutes.join(",");
  }
  env.TAILSCALE_EXIT_NODE = String(settings.exitNode);
  env.TAILSCALE_SSH = String(settings.ssh);
  return env;
}

// ─── LAN detection ───────────────────────────────────────────────────────────

/**
 * Find the LAN subnet of the default-route interface.
 * @param routeGetOutput output of `ip route get 1.1.1.1`
 * @param routeListOutput output of `ip -4 route show proto kernel scope link`
 */
export function extractLanSubnet(routeGetOutput: string, routeListOutput: string): string | null {
  const iface = routeGetOutput.match(/\bdev\s+(\S+)/)?.[1];
  if (!iface || /^(tailscale|docker|br-|veth|lo$)/.test(iface)) return null;

  for (const line of routeListOutput.split("\n")) {
    const parts = line.trim().split(/\s+/);
    const devIdx = parts.indexOf("dev");
    if (devIdx === -1 || parts[devIdx + 1] !== iface) continue;
    const cidr = parts[0];
    if (cidr && cidr.includes("/") && isValidCidr(cidr)) return cidr;
  }
  return null;
}

/** Detect the LAN subnet (e.g. 192.168.1.0/24), or null if it can't be determined */
export async function detectLanSubnet(): Promise<string | null> {
  const [get, list] = await Promise.all([
    shell("ip", ["route", "get", "1.1.1.1"], { ignoreError: true }),
    shell("ip", ["-4", "route", "show", "proto", "kernel", "scope", "link"], { ignoreError: true }),
  ]);
  if (get.exitCode !== 0 || list.exitCode !== 0) return null;
  return extractLanSubnet(get.stdout, list.stdout);
}

// ─── Command building ────────────────────────────────────────────────────────

export interface UpArgsOptions {
  /** Path to a file containing the auth key (passed as file:<path> so it never shows in `ps`) */
  authKeyFile?: string;
  /** Non-root Unix user allowed to operate tailscaled */
  operator?: string;
  /** Print a QR code for the login URL */
  qr?: boolean;
  /** Max time to wait for the Running state, in seconds */
  timeoutSeconds?: number;
}

/** Build `tailscale up` arguments. `--reset` makes the command idempotent across re-runs. */
export function buildTailscaleUpArgs(settings: TailscaleSettings, opts: UpArgsOptions = {}): string[] {
  const args = [
    "up",
    "--reset",
    `--hostname=${settings.hostname}`,
    // The homelab may run Pi-hole; Tailscale recommends not taking over DNS on the DNS host
    "--accept-dns=false",
  ];
  if (settings.advertiseRoutes.length > 0) {
    args.push(`--advertise-routes=${settings.advertiseRoutes.join(",")}`);
  }
  if (settings.exitNode) args.push("--advertise-exit-node");
  if (settings.ssh) args.push("--ssh");
  if (opts.operator) args.push(`--operator=${opts.operator}`);
  if (opts.authKeyFile) args.push(`--auth-key=file:${opts.authKeyFile}`);
  if (opts.qr) args.push("--qr");
  if (opts.timeoutSeconds) args.push(`--timeout=${opts.timeoutSeconds}s`);
  return args;
}

/** Build `tailscale set` arguments to change settings on an already-connected node */
export function buildTailscaleSetArgs(settings: TailscaleSettings): string[] {
  return [
    "set",
    `--hostname=${settings.hostname}`,
    "--accept-dns=false",
    `--advertise-routes=${settings.advertiseRoutes.join(",")}`,
    `--advertise-exit-node=${settings.exitNode}`,
    `--ssh=${settings.ssh}`,
    // Don't block on the "you may lose your SSH session" confirmation when disabling Tailscale SSH
    "--accept-risk=lose-ssh",
  ];
}

// ─── Status ──────────────────────────────────────────────────────────────────

export type TailscaleBackendState =
  | "NoState"
  | "NeedsLogin"
  | "NeedsMachineAuth"
  | "Stopped"
  | "Starting"
  | "Running"
  | "Unknown";

export interface TailscaleStatus {
  installed: boolean;
  /** tailscaled is reachable */
  daemonRunning: boolean;
  backendState: TailscaleBackendState;
  /** Logged in and connected to the tailnet */
  connected: boolean;
  version?: string;
  /** Login URL while waiting for interactive sign-in */
  authUrl?: string;
  ipv4?: string;
  ipv6?: string;
  /** Full MagicDNS name, e.g. mithrandir.tail1234.ts.net */
  dnsName?: string;
  hostname?: string;
  /** Tailnet name (usually the account email or organisation) */
  tailnet?: string;
  magicDnsSuffix?: string;
  /** Subnet routes approved by the tailnet admin */
  approvedRoutes: string[];
  /** Exit node approved by the tailnet admin */
  exitNodeApproved: boolean;
  /** ISO date when the node key expires (absent when expiry is disabled) */
  keyExpiry?: string;
}

const EMPTY_STATUS: TailscaleStatus = {
  installed: false,
  daemonRunning: false,
  backendState: "Unknown",
  connected: false,
  approvedRoutes: [],
  exitNodeApproved: false,
};

const KNOWN_STATES = new Set<string>([
  "NoState",
  "NeedsLogin",
  "NeedsMachineAuth",
  "Stopped",
  "Starting",
  "Running",
]);

/** Parse `tailscale status --json` output. Throws on invalid JSON. */
export function parseTailscaleStatusJson(raw: string): Omit<TailscaleStatus, "installed" | "daemonRunning"> {
  const data = JSON.parse(raw) as {
    Version?: string;
    BackendState?: string;
    AuthURL?: string;
    TailscaleIPs?: string[] | null;
    MagicDNSSuffix?: string;
    CurrentTailnet?: { Name?: string; MagicDNSSuffix?: string } | null;
    Self?: {
      HostName?: string;
      DNSName?: string;
      TailscaleIPs?: string[] | null;
      AllowedIPs?: string[] | null;
      PrimaryRoutes?: string[] | null;
      KeyExpiry?: string;
    } | null;
  };

  const backendState = (
    data.BackendState && KNOWN_STATES.has(data.BackendState) ? data.BackendState : "Unknown"
  ) as TailscaleBackendState;
  const self = data.Self ?? undefined;
  const ips = self?.TailscaleIPs ?? data.TailscaleIPs ?? [];
  const ownPrefixes = new Set(ips.map((ip) => (ip.includes(":") ? `${ip}/128` : `${ip}/32`)));

  const allowed = self?.AllowedIPs ?? [];
  const isDefaultRoute = (r: string) => r === "0.0.0.0/0" || r === "::/0";
  const approvedRoutes = [
    ...new Set([
      ...allowed.filter((r) => !ownPrefixes.has(r) && !isDefaultRoute(r)),
      ...(self?.PrimaryRoutes ?? []).filter((r) => !isDefaultRoute(r)),
    ]),
  ];

  const dnsName = self?.DNSName?.replace(/\.$/, "") || undefined;
  const keyExpiry = self?.KeyExpiry && !self.KeyExpiry.startsWith("0001-") ? self.KeyExpiry : undefined;

  return {
    backendState,
    connected: backendState === "Running",
    version: data.Version?.split("-")[0],
    authUrl: data.AuthURL || undefined,
    ipv4: ips.find((ip) => !ip.includes(":")),
    ipv6: ips.find((ip) => ip.includes(":")),
    dnsName,
    hostname: self?.HostName,
    tailnet: data.CurrentTailnet?.Name || undefined,
    magicDnsSuffix: data.CurrentTailnet?.MagicDNSSuffix || data.MagicDNSSuffix || undefined,
    approvedRoutes,
    exitNodeApproved: allowed.some(isDefaultRoute),
    keyExpiry,
  };
}

/** Routes from `wanted` that aren't approved yet */
export function getPendingRoutes(status: TailscaleStatus, wanted: string[]): string[] {
  return wanted.filter((r) => !status.approvedRoutes.includes(r));
}

/** Days until the node key expires, or null when expiry is disabled/unknown */
export function daysUntilKeyExpiry(status: TailscaleStatus, now = new Date()): number | null {
  if (!status.keyExpiry) return null;
  const expiry = new Date(status.keyExpiry).getTime();
  if (Number.isNaN(expiry)) return null;
  return Math.floor((expiry - now.getTime()) / 86_400_000);
}

/** Check if the tailscale CLI is installed */
export async function isTailscaleInstalled(): Promise<boolean> {
  return commandExists("tailscale");
}

/** Get the current Tailscale state. Never throws. */
export async function getTailscaleStatus(): Promise<TailscaleStatus> {
  try {
    if (!(await isTailscaleInstalled())) return { ...EMPTY_STATUS };
    const result = await shell("tailscale", ["status", "--json"], { ignoreError: true, timeout: 10_000 });
    try {
      return { installed: true, daemonRunning: true, ...parseTailscaleStatusJson(result.stdout) };
    } catch {
      return { ...EMPTY_STATUS, installed: true };
    }
  } catch {
    return { ...EMPTY_STATUS };
  }
}

// ─── Install / system configuration ──────────────────────────────────────────

/** Install Tailscale from the official apt repository (falls back to the official install script) */
export async function installTailscale(): Promise<void> {
  const distro = await detectDistro();
  const base = `https://pkgs.tailscale.com/stable/${distro.id}/${distro.versionCodename}`;

  try {
    await shell("curl", ["-fsSL", `${base}.noarmor.gpg`, "-o", KEYRING_PATH], { sudo: true });
    await shell("curl", ["-fsSL", `${base}.tailscale-keyring.list`, "-o", SOURCES_PATH], { sudo: true });
    await shell("apt-get", ["update", "-qq"], { sudo: true });
    await shell("apt-get", ["install", "-y", "-qq", "tailscale"], { sudo: true });
  } catch {
    // Codename not published on pkgs.tailscale.com (or repo unreachable) — use the official script
    await shell("rm", ["-f", SOURCES_PATH, KEYRING_PATH], { sudo: true, ignoreError: true });
    await shell("sh", ["-c", `curl -fsSL ${INSTALL_SCRIPT_URL} | sh`], { sudo: true });
  }

  await shell("systemctl", ["enable", "--now", "tailscaled"], { sudo: true, ignoreError: true });
  await waitForDaemon();
}

/** Wait for tailscaled to answer status requests */
async function waitForDaemon(timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getTailscaleStatus();
    if (status.daemonRunning) return;
    await Bun.sleep(1000);
  }
}

/** Make sure tailscaled is enabled and running */
export async function ensureTailscaleDaemon(): Promise<void> {
  const status = await getTailscaleStatus();
  if (status.daemonRunning) return;
  await shell("systemctl", ["enable", "--now", "tailscaled"], { sudo: true });
  await waitForDaemon();
}

/** Enable IPv4/IPv6 forwarding persistently (required for subnet routers and exit nodes) */
export async function enableIpForwarding(): Promise<void> {
  const content = "net.ipv4.ip_forward = 1\nnet.ipv6.conf.all.forwarding = 1\n";
  const tmp = join(tmpdir(), `99-tailscale.conf.${process.pid}.tmp`);
  writeFileSync(tmp, content);
  await shell("mv", [tmp, TAILSCALE_SYSCTL_PATH], { sudo: true });
  await shell("chmod", ["644", TAILSCALE_SYSCTL_PATH], { sudo: true, ignoreError: true });
  await shell("sysctl", ["-p", TAILSCALE_SYSCTL_PATH], { sudo: true, ignoreError: true });
}

/** Non-root user who will operate tailscaled (so `tailscale set`/`serve` work without sudo) */
export async function getOperatorUser(): Promise<string | undefined> {
  const user =
    process.env.SUDO_USER ?? (await shell("id", ["-un"], { ignoreError: true })).stdout.trim();
  return user && user !== "root" ? user : undefined;
}

// ─── Connect ─────────────────────────────────────────────────────────────────

const AUTH_URL_RE = /https:\/\/[^\s"']+\/a\/[A-Za-z0-9]+/;

/** Extract the interactive login URL from `tailscale up` output */
export function extractAuthUrl(output: string): string | null {
  return output.match(AUTH_URL_RE)?.[0] ?? null;
}

/** Extract the QR code block printed by `tailscale up --qr` (lines made of block characters) */
export function extractQrCode(output: string): string | null {
  const lines = output.split("\n");
  const isQrLine = (l: string) => l.length >= 10 && /^[\s█▀▄]+$/.test(l) && /[█▀▄]/.test(l);
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isQrLine(lines[i])) {
      if (start === -1) start = i;
      end = i;
    } else if (start !== -1) {
      break;
    }
  }
  if (start === -1 || end - start < 5) return null;
  return lines.slice(start, end + 1).join("\n");
}

export interface ConnectOptions {
  /** Pre-generated auth key (tskey-auth-…) for unattended login */
  authKey?: string;
  /** Called once with the login URL when interactive sign-in is needed */
  onAuthUrl?: (url: string, qr: string | null) => void;
  /** Ask tailscale to print a QR code (CLI only) */
  qr?: boolean;
  /** How long to wait for sign-in before giving up (default 10 minutes) */
  timeoutMs?: number;
}

/**
 * Run `tailscale up` and wait until the node is connected.
 * For interactive login, `onAuthUrl` is invoked with the sign-in URL as soon as it's known.
 * Resolves with the final status; rejects if login fails or times out.
 */
export async function connectTailscale(
  settings: TailscaleSettings,
  opts: ConnectOptions = {},
): Promise<TailscaleStatus> {
  const timeoutMs = opts.timeoutMs ?? 10 * 60_000;
  let authKeyFile: string | undefined;
  if (opts.authKey) {
    authKeyFile = join(tmpdir(), `mithrandir-ts-${process.pid}-${Date.now()}.key`);
    writeFileSync(authKeyFile, opts.authKey.trim(), { mode: 0o600 });
  }

  const args = buildTailscaleUpArgs(settings, {
    authKeyFile,
    operator: await getOperatorUser(),
    qr: opts.qr,
    timeoutSeconds: Math.ceil(timeoutMs / 1000),
  });
  const isRoot = process.getuid?.() === 0;
  const cmd = isRoot ? ["tailscale", ...args] : ["sudo", "tailscale", ...args];

  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  let output = "";
  let reportedUrl = false;

  const report = (url: string) => {
    if (reportedUrl) return;
    reportedUrl = true;
    // Give `--qr` output a moment to arrive after the URL line
    setTimeout(() => opts.onAuthUrl?.(url, extractQrCode(output)), opts.qr ? 300 : 0);
  };

  const pump = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      output += decoder.decode(chunk, { stream: true });
      const url = extractAuthUrl(output);
      if (url) report(url);
    }
  };

  // Poll status as a fallback for discovering the login URL
  let polling = true;
  const poll = (async () => {
    while (polling) {
      await Bun.sleep(2000);
      if (!polling || reportedUrl) continue;
      const status = await getTailscaleStatus();
      if (status.authUrl && status.backendState === "NeedsLogin") report(status.authUrl);
    }
  })();

  try {
    const [exitCode] = await Promise.all([proc.exited, pump(proc.stdout), pump(proc.stderr)]);
    if (exitCode !== 0) {
      const message = output
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !/^[█▀▄\s]+$/.test(l))
        .slice(-3)
        .join(" ");
      throw new Error(message || `tailscale up exited with code ${exitCode}`);
    }
  } finally {
    polling = false;
    await poll.catch(() => {});
    if (authKeyFile && existsSync(authKeyFile)) {
      try {
        unlinkSync(authKeyFile);
      } catch {
        // best effort
      }
    }
  }

  return getTailscaleStatus();
}

/** Apply settings to an already-connected node */
export async function applyTailscaleSettings(settings: TailscaleSettings): Promise<void> {
  await shell("tailscale", buildTailscaleSetArgs(settings), { sudo: true });
}

/**
 * Poll until all `routes` are approved (or the timeout / abort signal fires).
 * Returns the routes still pending (empty when everything is approved).
 */
export async function waitForRouteApproval(
  routes: string[],
  { timeoutMs = 5 * 60_000, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let pending = routes;
  while (pending.length > 0 && Date.now() < deadline && !signal?.aborted) {
    const status = await getTailscaleStatus();
    pending = getPendingRoutes(status, routes);
    if (pending.length === 0) break;
    await Bun.sleep(3000);
  }
  return pending;
}

/** Disconnect from the tailnet (expires this node's key) */
export async function logoutTailscale(): Promise<void> {
  await shell("tailscale", ["logout"], { sudo: true, ignoreError: true, timeout: 20_000 });
}

/** Log out, purge the package and remove repo + sysctl files. Returns false if Tailscale wasn't installed. */
export async function uninstallTailscale(): Promise<boolean> {
  if (!(await isTailscaleInstalled())) return false;
  await logoutTailscale();
  await shell("systemctl", ["disable", "--now", "tailscaled"], { sudo: true, ignoreError: true });
  await shell("apt-get", ["purge", "-y", "-qq", "tailscale"], { sudo: true, ignoreError: true });
  await shell("rm", ["-f", SOURCES_PATH, KEYRING_PATH, TAILSCALE_SYSCTL_PATH], {
    sudo: true,
    ignoreError: true,
  });
  await shell("rm", ["-rf", "/var/lib/tailscale"], { sudo: true, ignoreError: true });
  return true;
}

// ─── Remote access URLs ──────────────────────────────────────────────────────

/** Preferred remote URL for an app port: MagicDNS name, then tailnet IP */
export function getTailnetAppUrl(status: TailscaleStatus, port: number): string | null {
  const host = status.dnsName ?? status.ipv4;
  return host ? `http://${host}:${port}` : null;
}
