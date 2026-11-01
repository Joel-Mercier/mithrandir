import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TAILSCALE_HOSTNAME,
  applyTailscaleSettingsToEnv,
  buildTailscaleSetArgs,
  buildTailscaleUpArgs,
  daysUntilKeyExpiry,
  extractAuthUrl,
  extractLanSubnet,
  extractQrCode,
  getPendingRoutes,
  getTailnetAppUrl,
  isValidCidr,
  parseRoutesSetting,
  parseTailscaleStatusJson,
  sanitizeHostname,
  type TailscaleSettings,
  type TailscaleStatus,
} from "@/lib/tailscale.js";
import type { EnvConfig } from "@/types.js";

const baseSettings: TailscaleSettings = {
  hostname: "mithrandir",
  advertiseRoutes: ["192.168.1.0/24"],
  exitNode: false,
  ssh: false,
};

function status(partial: Partial<TailscaleStatus> = {}): TailscaleStatus {
  return {
    installed: true,
    daemonRunning: true,
    backendState: "Running",
    connected: true,
    approvedRoutes: [],
    exitNodeApproved: false,
    ...partial,
  };
}

describe("parseRoutesSetting", () => {
  test("unset and 'auto' mean auto-detect", () => {
    expect(parseRoutesSetting(undefined)).toBe("auto");
    expect(parseRoutesSetting("")).toBe("auto");
    expect(parseRoutesSetting("AUTO")).toBe("auto");
  });

  test("'none' disables routes", () => {
    expect(parseRoutesSetting("none")).toEqual([]);
    expect(parseRoutesSetting("false")).toEqual([]);
    expect(parseRoutesSetting("off")).toEqual([]);
  });

  test("comma-separated CIDRs are split and trimmed", () => {
    expect(parseRoutesSetting("192.168.1.0/24, 10.0.0.0/8")).toEqual(["192.168.1.0/24", "10.0.0.0/8"]);
  });
});

describe("isValidCidr", () => {
  test("accepts IPv4 and IPv6 prefixes", () => {
    expect(isValidCidr("192.168.1.0/24")).toBe(true);
    expect(isValidCidr("10.0.0.0/8")).toBe(true);
    expect(isValidCidr("fd00::/64")).toBe(true);
  });

  test("rejects malformed input", () => {
    expect(isValidCidr("192.168.1.0")).toBe(false);
    expect(isValidCidr("192.168.1.0/33")).toBe(false);
    expect(isValidCidr("192.168.1/24")).toBe(false);
    expect(isValidCidr("300.1.1.1/24")).toBe(false);
    expect(isValidCidr("a.b.c.d/24")).toBe(false);
    expect(isValidCidr("10.0.0.0/8/1")).toBe(false);
    expect(isValidCidr("fd00::/129")).toBe(false);
  });
});

describe("sanitizeHostname", () => {
  test("lowercases and replaces invalid characters", () => {
    expect(sanitizeHostname("My Home_Server!")).toBe("my-home-server");
  });

  test("trims leading/trailing dashes and limits to 63 chars", () => {
    expect(sanitizeHostname("--server--")).toBe("server");
    expect(sanitizeHostname("a".repeat(80))).toHaveLength(63);
  });

  test("falls back to the default name", () => {
    expect(sanitizeHostname(undefined)).toBe(DEFAULT_TAILSCALE_HOSTNAME);
    expect(sanitizeHostname("!!!")).toBe(DEFAULT_TAILSCALE_HOSTNAME);
  });
});

describe("extractLanSubnet", () => {
  const routeGet = "1.1.1.1 via 192.168.1.1 dev eth0 src 192.168.1.50 uid 1000\n    cache";
  const routeList = [
    "172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown",
    "192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.50",
  ].join("\n");

  test("returns the subnet of the default-route interface", () => {
    expect(extractLanSubnet(routeGet, routeList)).toBe("192.168.1.0/24");
  });

  test("ignores tailscale/docker interfaces", () => {
    expect(extractLanSubnet("1.1.1.1 dev tailscale0 src 100.64.0.1", routeList)).toBeNull();
    expect(extractLanSubnet("1.1.1.1 dev docker0 src 172.17.0.1", routeList)).toBeNull();
  });

  test("returns null when nothing matches", () => {
    expect(extractLanSubnet("", routeList)).toBeNull();
    expect(extractLanSubnet(routeGet, "")).toBeNull();
  });
});

describe("buildTailscaleUpArgs", () => {
  test("includes reset, hostname, dns and routes", () => {
    expect(buildTailscaleUpArgs(baseSettings)).toEqual([
      "up",
      "--reset",
      "--hostname=mithrandir",
      "--accept-dns=false",
      "--advertise-routes=192.168.1.0/24",
    ]);
  });

  test("adds optional flags", () => {
    const args = buildTailscaleUpArgs(
      { ...baseSettings, advertiseRoutes: [], exitNode: true, ssh: true },
      { authKeyFile: "/tmp/key", operator: "joel", qr: true, timeoutSeconds: 600 },
    );
    expect(args).not.toContain("--advertise-routes=");
    expect(args).toContain("--advertise-exit-node");
    expect(args).toContain("--ssh");
    expect(args).toContain("--operator=joel");
    expect(args).toContain("--auth-key=file:/tmp/key");
    expect(args).toContain("--qr");
    expect(args).toContain("--timeout=600s");
  });
});

describe("buildTailscaleSetArgs", () => {
  test("always sets every managed flag explicitly", () => {
    expect(buildTailscaleSetArgs({ ...baseSettings, advertiseRoutes: [] })).toEqual([
      "set",
      "--hostname=mithrandir",
      "--accept-dns=false",
      "--advertise-routes=",
      "--advertise-exit-node=false",
      "--ssh=false",
      "--accept-risk=lose-ssh",
    ]);
  });
});

describe("parseTailscaleStatusJson", () => {
  const running = JSON.stringify({
    Version: "1.90.2-t1234abcd",
    BackendState: "Running",
    AuthURL: "",
    TailscaleIPs: ["100.101.102.103", "fd7a:115c:a1e0::1"],
    CurrentTailnet: { Name: "user@example.com", MagicDNSSuffix: "tail1234.ts.net" },
    Self: {
      HostName: "mithrandir",
      DNSName: "mithrandir.tail1234.ts.net.",
      TailscaleIPs: ["100.101.102.103", "fd7a:115c:a1e0::1"],
      AllowedIPs: ["100.101.102.103/32", "fd7a:115c:a1e0::1/128", "192.168.1.0/24", "0.0.0.0/0", "::/0"],
      PrimaryRoutes: ["192.168.1.0/24"],
      KeyExpiry: "2027-04-30T10:00:00Z",
    },
  });

  test("parses a connected node", () => {
    const s = parseTailscaleStatusJson(running);
    expect(s.backendState).toBe("Running");
    expect(s.connected).toBe(true);
    expect(s.version).toBe("1.90.2");
    expect(s.ipv4).toBe("100.101.102.103");
    expect(s.ipv6).toBe("fd7a:115c:a1e0::1");
    expect(s.dnsName).toBe("mithrandir.tail1234.ts.net");
    expect(s.tailnet).toBe("user@example.com");
    expect(s.magicDnsSuffix).toBe("tail1234.ts.net");
    expect(s.approvedRoutes).toEqual(["192.168.1.0/24"]);
    expect(s.exitNodeApproved).toBe(true);
    expect(s.keyExpiry).toBe("2027-04-30T10:00:00Z");
    expect(s.authUrl).toBeUndefined();
  });

  test("parses a node waiting for login", () => {
    const s = parseTailscaleStatusJson(
      JSON.stringify({ BackendState: "NeedsLogin", AuthURL: "https://login.tailscale.com/a/abc123", Self: null }),
    );
    expect(s.connected).toBe(false);
    expect(s.backendState).toBe("NeedsLogin");
    expect(s.authUrl).toBe("https://login.tailscale.com/a/abc123");
    expect(s.approvedRoutes).toEqual([]);
    expect(s.exitNodeApproved).toBe(false);
  });

  test("ignores zero key expiry and unknown states", () => {
    const s = parseTailscaleStatusJson(
      JSON.stringify({ BackendState: "Weird", Self: { KeyExpiry: "0001-01-01T00:00:00Z" } }),
    );
    expect(s.backendState).toBe("Unknown");
    expect(s.keyExpiry).toBeUndefined();
  });

  test("throws on invalid JSON", () => {
    expect(() => parseTailscaleStatusJson("not json")).toThrow();
  });
});

describe("getPendingRoutes", () => {
  test("returns wanted routes that are not approved", () => {
    const s = status({ approvedRoutes: ["192.168.1.0/24"] });
    expect(getPendingRoutes(s, ["192.168.1.0/24", "10.0.0.0/24"])).toEqual(["10.0.0.0/24"]);
    expect(getPendingRoutes(s, [])).toEqual([]);
  });
});

describe("daysUntilKeyExpiry", () => {
  const now = new Date("2026-11-01T00:00:00Z");

  test("returns whole days remaining", () => {
    expect(daysUntilKeyExpiry(status({ keyExpiry: "2026-11-11T12:00:00Z" }), now)).toBe(10);
  });

  test("returns null when expiry is disabled or invalid", () => {
    expect(daysUntilKeyExpiry(status(), now)).toBeNull();
    expect(daysUntilKeyExpiry(status({ keyExpiry: "garbage" }), now)).toBeNull();
  });
});

describe("extractAuthUrl", () => {
  test("finds the login URL in tailscale up output", () => {
    const out = "\nTo authenticate, visit:\n\n\thttps://login.tailscale.com/a/1a2b3c4d5e\n\n";
    expect(extractAuthUrl(out)).toBe("https://login.tailscale.com/a/1a2b3c4d5e");
  });

  test("returns null without a URL", () => {
    expect(extractAuthUrl("Success.")).toBeNull();
  });
});

describe("extractQrCode", () => {
  test("extracts the block-character QR code", () => {
    const qrLines = Array.from({ length: 8 }, (_, i) => (i % 2 ? "█▀▄ ▄▀█ █▄▀ ▀▄█" : "▄▄▄ █ ▀▀▀ █ ▄▄▄"));
    const out = ["To authenticate, visit:", "", "\thttps://login.tailscale.com/a/abc", "", ...qrLines, ""].join("\n");
    expect(extractQrCode(out)).toBe(qrLines.join("\n"));
  });

  test("returns null when there is no QR code", () => {
    expect(extractQrCode("To authenticate, visit:\nhttps://login.tailscale.com/a/abc")).toBeNull();
  });
});

describe("applyTailscaleSettingsToEnv", () => {
  const env = (): EnvConfig => ({ BASE_DIR: "/home/u", PUID: "1000", PGID: "1000", TZ: "UTC" });

  test("stores 'auto' when the route matches the detected LAN", () => {
    const e = applyTailscaleSettingsToEnv(env(), baseSettings, "192.168.1.0/24");
    expect(e.ENABLE_TAILSCALE).toBe("true");
    expect(e.TAILSCALE_HOSTNAME).toBe("mithrandir");
    expect(e.TAILSCALE_ADVERTISE_ROUTES).toBe("auto");
    expect(e.TAILSCALE_EXIT_NODE).toBe("false");
    expect(e.TAILSCALE_SSH).toBe("false");
  });

  test("stores explicit CIDRs or 'none'", () => {
    expect(
      applyTailscaleSettingsToEnv(env(), { ...baseSettings, advertiseRoutes: ["10.0.0.0/24", "10.0.1.0/24"] }, "192.168.1.0/24")
        .TAILSCALE_ADVERTISE_ROUTES,
    ).toBe("10.0.0.0/24,10.0.1.0/24");
    expect(
      applyTailscaleSettingsToEnv(env(), { ...baseSettings, advertiseRoutes: [], exitNode: true, ssh: true }, null),
    ).toMatchObject({ TAILSCALE_ADVERTISE_ROUTES: "none", TAILSCALE_EXIT_NODE: "true", TAILSCALE_SSH: "true" });
  });
});

describe("getTailnetAppUrl", () => {
  test("prefers the MagicDNS name, then the tailnet IP", () => {
    expect(getTailnetAppUrl(status({ dnsName: "m.tail.ts.net", ipv4: "100.1.1.1" }), 8096)).toBe("http://m.tail.ts.net:8096");
    expect(getTailnetAppUrl(status({ ipv4: "100.1.1.1" }), 8096)).toBe("http://100.1.1.1:8096");
    expect(getTailnetAppUrl(status(), 8096)).toBeNull();
  });
});
