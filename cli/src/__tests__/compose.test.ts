import { describe, expect, test } from "bun:test";
import { generateCompose } from "@/lib/compose.js";
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
});
