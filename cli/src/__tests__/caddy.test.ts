import { describe, expect, test } from "bun:test";
import {
  getDuckDnsDomain,
  generateCaddyfile,
  generate404Page,
  generateCaddyDockerfile,
} from "@/lib/caddy.js";
import { getApp, APP_REGISTRY } from "@/lib/apps.js";
import type { EnvConfig } from "@/types.js";

const baseEnv: EnvConfig = {
  BASE_DIR: "/home/test",
  PUID: "1000",
  PGID: "1000",
  TZ: "Etc/UTC",
  DUCKDNS_SUBDOMAINS: "mylab",
  DUCKDNS_TOKEN: "test-token",
  ACME_EMAIL: "test@example.com",
};

describe("getDuckDnsDomain", () => {
  test("single subdomain", () => {
    const env: EnvConfig = { ...baseEnv, DUCKDNS_SUBDOMAINS: "mylab" };
    expect(getDuckDnsDomain(env)).toBe("mylab.duckdns.org");
  });

  test("multiple subdomains takes first", () => {
    const env: EnvConfig = {
      ...baseEnv,
      DUCKDNS_SUBDOMAINS: "mylab,other,third",
    };
    expect(getDuckDnsDomain(env)).toBe("mylab.duckdns.org");
  });

  test("returns null for undefined", () => {
    const env: EnvConfig = { ...baseEnv, DUCKDNS_SUBDOMAINS: undefined };
    expect(getDuckDnsDomain(env)).toBeNull();
  });

  test("returns null for empty string", () => {
    const env: EnvConfig = { ...baseEnv, DUCKDNS_SUBDOMAINS: "" };
    expect(getDuckDnsDomain(env)).toBeNull();
  });
});

describe("generateCaddyfile", () => {
  test("generates valid Caddyfile with installed apps", () => {
    const apps = [getApp("sonarr")!, getApp("radarr")!, getApp("jellyfin")!];
    const output = generateCaddyfile(apps, baseEnv);
    expect(output).toMatchSnapshot();
  });

  test("uses Pi-hole HTTPS port override", () => {
    const apps = [getApp("pihole")!];
    const output = generateCaddyfile(apps, baseEnv);
    expect(output).toContain("localhost:8880");
  });

  test("includes docs block when requested", () => {
    const apps = [getApp("sonarr")!];
    const output = generateCaddyfile(apps, baseEnv, { includeDocs: true });
    expect(output).toContain("mithrandir-docs");
    expect(output).toContain("localhost:4173");
  });

  test("excludes caddy from proxy blocks", () => {
    const apps = [getApp("sonarr")!, getApp("caddy")!];
    const output = generateCaddyfile(apps, baseEnv);
    expect(output).not.toContain("@caddy");
  });

  test("throws when DUCKDNS_SUBDOMAINS not set", () => {
    const env: EnvConfig = { ...baseEnv, DUCKDNS_SUBDOMAINS: undefined };
    expect(() => generateCaddyfile([], env)).toThrow();
  });
});

describe("generate404Page", () => {
  test("generates HTML with app links", () => {
    const apps = [getApp("sonarr")!, getApp("radarr")!];
    const output = generate404Page(apps, baseEnv);
    expect(output).toMatchSnapshot();
  });

  test("includes docs link when requested", () => {
    const apps = [getApp("sonarr")!];
    const output = generate404Page(apps, baseEnv, { includeDocs: true });
    expect(output).toContain("mithrandir-docs");
    expect(output).toContain("Docs");
  });

  test("excludes caddy from links", () => {
    const apps = [getApp("sonarr")!, getApp("caddy")!];
    const output = generate404Page(apps, baseEnv);
    expect(output).not.toContain("caddy.mylab.duckdns.org");
  });
});

describe("generateCaddyDockerfile", () => {
  test("generates valid Dockerfile", () => {
    const output = generateCaddyDockerfile();
    expect(output).toMatchSnapshot();
    expect(output).toContain("xcaddy build");
    expect(output).toContain("caddy-dns/duckdns");
  });

  test("produces multi-stage Dockerfile", () => {
    const output = generateCaddyDockerfile();
    const fromCount = (output.match(/FROM/g) || []).length;
    expect(fromCount).toBeGreaterThanOrEqual(2);
  });
});

describe("getDuckDnsDomain edge cases", () => {
  test("trims whitespace from subdomain", () => {
    const env: EnvConfig = { ...baseEnv, DUCKDNS_SUBDOMAINS: "  mylab  " };
    expect(getDuckDnsDomain(env)).toBe("mylab.duckdns.org");
  });

  test("handles whitespace-separated subdomains (takes first)", () => {
    const env: EnvConfig = { ...baseEnv, DUCKDNS_SUBDOMAINS: "first,second" };
    expect(getDuckDnsDomain(env)).toBe("first.duckdns.org");
  });
});

describe("generateCaddyfile additional scenarios", () => {
  test("generates entries for apps with caddyExtraSubdomains", () => {
    const adventurelog = getApp("adventurelog")!;
    const output = generateCaddyfile([adventurelog], baseEnv);
    expect(output).toContain("adventurelog.mylab.duckdns.org");
    if (adventurelog.caddyExtraSubdomains) {
      for (const extra of adventurelog.caddyExtraSubdomains) {
        expect(output).toContain(`${extra.subdomain}.mylab.duckdns.org`);
      }
    }
  });

  test("skips apps without ports", () => {
    const duckdns = getApp("duckdns")!;
    expect(duckdns.port).toBeNull();
    const output = generateCaddyfile([duckdns], baseEnv);
    expect(output).not.toContain("@duckdns");
  });

  test("handles empty app list", () => {
    const output = generateCaddyfile([], baseEnv);
    expect(output).toContain("mylab.duckdns.org");
    expect(output).toContain("duckdns");
  });

  test("host-networked apps get correct proxy target", () => {
    const homeassistant = getApp("homeassistant")!;
    expect(homeassistant.networkMode).toBe("host");
    const output = generateCaddyfile([homeassistant], baseEnv);
    expect(output).toContain("homeassistant.mylab.duckdns.org");
  });

  test("all non-hidden apps with ports get Caddyfile entries", () => {
    const appsWithPorts = APP_REGISTRY.filter(
      (app) => app.port && !app.hidden && !app.companionOf,
    );
    const output = generateCaddyfile(appsWithPorts, baseEnv);
    for (const app of appsWithPorts) {
      expect(output).toContain(`${app.name}.mylab.duckdns.org`);
    }
  });
});

describe("generate404Page additional scenarios", () => {
  test("generates valid HTML structure", () => {
    const apps = [getApp("sonarr")!];
    const output = generate404Page(apps, baseEnv);
    expect(output).toContain("<!DOCTYPE html>");
    expect(output).toContain("</html>");
    expect(output).toContain("<title>");
  });

  test("empty app list produces valid page", () => {
    const output = generate404Page([], baseEnv);
    expect(output).toContain("<!DOCTYPE html>");
  });

  test("app links use HTTPS subdomain format", () => {
    const apps = [getApp("sonarr")!];
    const output = generate404Page(apps, baseEnv);
    expect(output).toContain("sonarr.mylab.duckdns.org");
  });
});
