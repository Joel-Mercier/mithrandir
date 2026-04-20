import { describe, expect, test } from "bun:test";
import { generateCompose, generateGatusExtraHosts, PIHOLE_HTTPS_PORT } from "@/lib/compose.js";
import { getApp } from "@/lib/apps.js";
import type { EnvConfig } from "@/types.js";

const baseEnv: EnvConfig = {
  BASE_DIR: "/home/test",
  PUID: "1000",
  PGID: "1000",
  TZ: "Etc/UTC",
};

describe("generateCompose", () => {
  test("simple LinuxServer app (Sonarr)", () => {
    const app = getApp("sonarr")!;
    const output = generateCompose(app, baseEnv);
    expect(output).toMatchSnapshot();
  });

  test("host-networked app (Home Assistant)", () => {
    const app = getApp("homeassistant")!;
    const output = generateCompose(app, baseEnv);
    expect(output).toMatchSnapshot();
  });

  test("app with secrets (DuckDNS)", () => {
    const app = getApp("duckdns")!;
    const env: EnvConfig = {
      ...baseEnv,
      DUCKDNS_SUBDOMAINS: "mylab",
      DUCKDNS_TOKEN: "abc-123-token",
    };
    const output = generateCompose(app, env);
    expect(output).toMatchSnapshot();
  });

  test("app with healthcheck (Seerr)", () => {
    const app = getApp("seerr")!;
    const output = generateCompose(app, baseEnv);
    expect(output).toMatchSnapshot();
  });

  test("app with capabilities/sysctls (WireGuard)", () => {
    const app = getApp("wireguard")!;
    const env: EnvConfig = {
      ...baseEnv,
      WG_SERVERURL: "vpn.example.com",
      WG_PEERS: "3",
    };
    const output = generateCompose(app, env);
    expect(output).toMatchSnapshot();
  });

  test("app with multiple config dirs (Homarr)", () => {
    const app = getApp("homarr")!;
    const output = generateCompose(app, baseEnv);
    expect(output).toMatchSnapshot();
  });

  test("app with data dir read-only (Jellyfin)", () => {
    const app = getApp("jellyfin")!;
    const output = generateCompose(app, baseEnv);
    expect(output).toMatchSnapshot();
  });

  test("app with music dir (Navidrome)", () => {
    const app = getApp("navidrome")!;
    const output = generateCompose(app, baseEnv);
    expect(output).toMatchSnapshot();
  });

  test("Pi-hole with ENABLE_HTTPS=false", () => {
    const app = getApp("pihole")!;
    const env: EnvConfig = {
      ...baseEnv,
      ENABLE_HTTPS: "false",
      PIHOLE_PASSWORD: "admin123",
    };
    const output = generateCompose(app, env);
    expect(output).toMatchSnapshot();
  });

  test("Pi-hole with ENABLE_HTTPS=true (port remapping)", () => {
    const app = getApp("pihole")!;
    const env: EnvConfig = {
      ...baseEnv,
      ENABLE_HTTPS: "true",
      DUCKDNS_SUBDOMAINS: "mylab",
      PIHOLE_PASSWORD: "admin123",
    };
    const output = generateCompose(app, env);
    expect(output).toMatchSnapshot();
    // Port 443 should be filtered, port 80 remapped to 8880
    expect(output).toContain("8880:80");
    expect(output).not.toContain("443:443");
  });

  test("rawCompose app (Immich) returns non-empty string", () => {
    const app = getApp("immich")!;
    const env: EnvConfig = {
      ...baseEnv,
      IMMICH_DB_PASSWORD: "testpass",
    };
    const output = generateCompose(app, env);
    expect(output.length).toBeGreaterThan(0);
    expect(output).toMatchSnapshot();
  });

  test("app with containerPort mapping (Excalidraw)", () => {
    const app = getApp("excalidraw")!;
    const output = generateCompose(app, baseEnv);
    expect(output).toMatchSnapshot();
    expect(output).toContain("5000:80");
  });

  test("app with init flag (Seerr)", () => {
    const app = getApp("seerr")!;
    const output = generateCompose(app, baseEnv);
    expect(output).toContain("init: true");
  });

  test("Gluetun rawCompose (VPN routing off)", () => {
    const app = getApp("gluetun")!;
    const env: EnvConfig = {
      ...baseEnv,
      VPN_SERVICE_PROVIDER: "mullvad",
      WIREGUARD_PRIVATE_KEY: "privkey",
      WIREGUARD_ADDRESSES: "10.64.0.2/32",
    };
    const output = generateCompose(app, env);
    expect(output).toMatchSnapshot();
    expect(output).toContain("cap_add:");
    expect(output).toContain("/dev/net/tun");
    expect(output).not.toContain("8080:8080");
  });

  test("Gluetun publishes qBittorrent ports when QBITTORRENT_USE_VPN=true", () => {
    const app = getApp("gluetun")!;
    const env: EnvConfig = {
      ...baseEnv,
      VPN_SERVICE_PROVIDER: "mullvad",
      WIREGUARD_PRIVATE_KEY: "privkey",
      WIREGUARD_ADDRESSES: "10.64.0.2/32",
      QBITTORRENT_USE_VPN: "true",
    };
    const output = generateCompose(app, env);
    expect(output).toContain("8080:8080");
    expect(output).toContain("6881:6881/tcp");
    expect(output).toContain("6881:6881/udp");
  });

  test("qBittorrent with QBITTORRENT_USE_VPN=true routes through Gluetun", () => {
    const app = getApp("qbittorrent")!;
    const env: EnvConfig = { ...baseEnv, QBITTORRENT_USE_VPN: "true" };
    const output = generateCompose(app, env);
    expect(output).toMatchSnapshot();
    expect(output).toContain("network_mode: container:gluetun");
    expect(output).not.toContain("ports:");
    expect(output).not.toContain("8080:8080");
  });

  test("qBittorrent with QBITTORRENT_USE_VPN unset keeps its own ports", () => {
    const app = getApp("qbittorrent")!;
    const output = generateCompose(app, baseEnv);
    expect(output).not.toContain("network_mode");
    expect(output).toContain("8080:8080");
    expect(output).toContain("6881:6881/tcp");
  });
});

describe("PIHOLE_HTTPS_PORT", () => {
  test("is 8880", () => {
    expect(PIHOLE_HTTPS_PORT).toBe(8880);
  });
});

describe("generateGatusExtraHosts", () => {
  const envWithDns: EnvConfig = {
    ...baseEnv,
    DUCKDNS_SUBDOMAINS: "mylab",
  };

  test("returns empty when no DUCKDNS_SUBDOMAINS set", () => {
    const apps = [getApp("sonarr")!];
    const hosts = generateGatusExtraHosts(apps, "192.168.1.100", baseEnv);
    expect(hosts).toEqual([]);
  });

  test("generates host entries for apps with ports", () => {
    const apps = [getApp("sonarr")!, getApp("radarr")!];
    const hosts = generateGatusExtraHosts(apps, "192.168.1.100", envWithDns);
    expect(hosts).toContain("sonarr.mylab.duckdns.org:192.168.1.100");
    expect(hosts).toContain("radarr.mylab.duckdns.org:192.168.1.100");
  });

  test("excludes gatus from its own hosts", () => {
    const apps = [getApp("gatus")!, getApp("sonarr")!];
    const hosts = generateGatusExtraHosts(apps, "192.168.1.100", envWithDns);
    expect(hosts).not.toContain("gatus.mylab.duckdns.org:192.168.1.100");
    expect(hosts).toContain("sonarr.mylab.duckdns.org:192.168.1.100");
  });

  test("excludes apps without ports (e.g. duckdns)", () => {
    const duckdns = getApp("duckdns")!;
    expect(duckdns.port).toBeNull();
    const hosts = generateGatusExtraHosts([duckdns], "192.168.1.100", envWithDns);
    expect(hosts).toEqual([]);
  });

  test("includes caddyExtraSubdomains entries", () => {
    const adventurelog = getApp("adventurelog")!;
    const hosts = generateGatusExtraHosts([adventurelog], "192.168.1.100", envWithDns);
    expect(hosts).toContain("adventurelog.mylab.duckdns.org:192.168.1.100");
    expect(hosts.some((h) => h.includes("adventurelog-api"))).toBe(true);
  });

  test("returns empty for empty app list", () => {
    const hosts = generateGatusExtraHosts([], "192.168.1.100", envWithDns);
    expect(hosts).toEqual([]);
  });
});

describe("generateCompose edge cases", () => {
  test("WireGuard compose includes NET_ADMIN capability", () => {
    const wg = getApp("wireguard")!;
    const env: EnvConfig = {
      ...baseEnv,
      WG_SERVERURL: "vpn.example.com",
      WG_PEERS: "3",
    };
    const output = generateCompose(wg, env);
    expect(output).toContain("NET_ADMIN");
    expect(output).toContain("cap_add:");
  });

  test("Vaultwarden compose includes DOMAIN when HTTPS enabled", () => {
    const vaultwarden = getApp("vaultwarden")!;
    const env: EnvConfig = {
      ...baseEnv,
      ENABLE_HTTPS: "true",
      DUCKDNS_SUBDOMAINS: "mylab",
    };
    const output = generateCompose(vaultwarden, env);
    expect(output).toContain("DOMAIN=https://vaultwarden.mylab.duckdns.org");
  });

  test("Pi-hole compose sets webserver domain when HTTPS enabled", () => {
    const pihole = getApp("pihole")!;
    const env: EnvConfig = {
      ...baseEnv,
      ENABLE_HTTPS: "true",
      DUCKDNS_SUBDOMAINS: "mylab",
      PIHOLE_PASSWORD: "admin",
    };
    const output = generateCompose(pihole, env);
    expect(output).toContain("FTLCONF_webserver_domain=pihole.mylab.duckdns.org");
  });

  test("Navidrome compose sets user from PUID:PGID", () => {
    const navidrome = getApp("navidrome")!;
    const output = generateCompose(navidrome, baseEnv);
    expect(output).toContain('user: "1000:1000"');
  });

  test("LinuxServer apps get PUID and PGID env vars", () => {
    const sonarr = getApp("sonarr")!;
    expect(sonarr.image).toContain("linuxserver");
    const output = generateCompose(sonarr, baseEnv);
    expect(output).toContain("PUID=1000");
    expect(output).toContain("PGID=1000");
    expect(output).toContain("TZ=Etc/UTC");
  });

  test("non-LinuxServer apps skip PUID/PGID", () => {
    const excalidraw = getApp("excalidraw")!;
    expect(excalidraw.image).not.toContain("linuxserver");
    const output = generateCompose(excalidraw, baseEnv);
    expect(output).not.toContain("PUID=");
    expect(output).not.toContain("PGID=");
  });

  test("all rawCompose apps generate non-empty output", () => {
    const rawComposeApps = [
      "immich", "sure", "affine", "penpot",
      "adventurelog", "yourspotify", "paperlessngx", "caddy",
    ];
    for (const appName of rawComposeApps) {
      const app = getApp(appName);
      if (!app?.rawCompose) continue;
      const output = generateCompose(app, baseEnv);
      expect(output.length).toBeGreaterThan(50);
      expect(output).toContain("services:");
    }
  });

  test("compose always includes restart policy", () => {
    const sonarr = getApp("sonarr")!;
    const output = generateCompose(sonarr, baseEnv);
    expect(output).toContain("restart: unless-stopped");
  });

  test("apps with mountDockerSocket include docker socket volume", () => {
    const homarr = getApp("homarr")!;
    if (homarr.mountDockerSocket) {
      const output = generateCompose(homarr, baseEnv);
      expect(output).toContain("/var/run/docker.sock");
    }
  });
});
