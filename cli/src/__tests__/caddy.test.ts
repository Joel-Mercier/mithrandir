import { describe, expect, test } from "bun:test";
import {
  getDuckDnsDomain,
  generateCaddyfile,
  generate404Page,
  generateCaddyDockerfile,
} from "@/lib/caddy.js";
import { getApp } from "@/lib/apps.js";
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
});
