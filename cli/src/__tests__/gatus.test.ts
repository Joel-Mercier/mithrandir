import { describe, expect, test } from "bun:test";
import { generateGatusConfig } from "@/lib/gatus.js";
import { getApp } from "@/lib/apps.js";
import type { EnvConfig } from "@/types.js";

const LOCAL_IP = "192.168.1.100";

const httpsEnv: EnvConfig = {
  BASE_DIR: "/home/test",
  PUID: "1000",
  PGID: "1000",
  TZ: "Etc/UTC",
  ENABLE_HTTPS: "true",
  DUCKDNS_SUBDOMAINS: "mylab",
  DUCKDNS_TOKEN: "test-token",
};

describe("generateGatusConfig", () => {
  test("generates config with single-container apps", () => {
    const apps = [getApp("sonarr")!, getApp("radarr")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {
      username: "admin",
      passwordBcryptBase64: "dGVzdGhhc2g=",
    });

    expect(config).toContain("web:");
    expect(config).toContain("port: 3001");
    expect(config).toContain("storage:");
    expect(config).toContain("path: /data/data.db");
    expect(config).toContain("username: admin");
    expect(config).toContain("password-bcrypt-base64: dGVzdGhhc2g=");
    expect(config).toContain("name: Sonarr");
    expect(config).toContain(`url: http://${LOCAL_IP}:8989`);
    expect(config).toContain("name: Radarr");
    expect(config).toContain(`url: http://${LOCAL_IP}:7878`);
    expect(config).toContain("group: single-container");
  });

  test("excludes gatus from its own endpoints", () => {
    const apps = [getApp("gatus")!, getApp("sonarr")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {});

    expect(config).not.toContain("name: Gatus");
    expect(config).toContain("name: Sonarr");
  });

  test("includes discord alerting when webhook provided", () => {
    const apps = [getApp("sonarr")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {
      discordWebhook: "https://discord.com/api/webhooks/test",
    });

    expect(config).toContain("alerting:");
    expect(config).toContain("webhook-url: https://discord.com/api/webhooks/test");
    expect(config).toContain("alerts:");
    expect(config).toContain("type: discord");
    expect(config).toContain("send-on-resolved: true");
  });

  test("omits discord alerting when no webhook", () => {
    const apps = [getApp("sonarr")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {});

    expect(config).not.toContain("alerting:");
    expect(config).not.toContain("alerts:");
  });

  test("multi-container apps get multi-container group", () => {
    const apps = [getApp("immich")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {});

    expect(config).toContain("name: Immich");
    expect(config).toContain("group: multi-container");
    expect(config).toContain(`url: http://${LOCAL_IP}:2283`);
  });

  test("apps with caddyExtraSubdomains get additional endpoints", () => {
    const apps = [getApp("adventurelog")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {});

    expect(config).toContain("name: AdventureLog");
    expect(config).toContain(`url: http://${LOCAL_IP}:8015`);
    expect(config).toContain("name: \"AdventureLog (adventurelog-api)\"");
    expect(config).toContain(`url: http://${LOCAL_IP}:8016`);
  });

  test("empty app list produces no endpoints section", () => {
    const config = generateGatusConfig([], LOCAL_IP, {
      username: "admin",
      passwordBcryptBase64: "dGVzdA==",
    });

    expect(config).toContain("web:");
    expect(config).not.toContain("endpoints:");
  });

  test("omits security when no username/password", () => {
    const config = generateGatusConfig([], LOCAL_IP, {});

    expect(config).not.toContain("security:");
    expect(config).not.toContain("username:");
  });

  test("Pi-hole uses HTTPS subdomain URL when HTTPS is enabled", () => {
    const apps = [getApp("pihole")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {
      envConfig: httpsEnv,
    });

    expect(config).toContain("url: https://pihole.mylab.duckdns.org");
    expect(config).not.toContain(`http://${LOCAL_IP}`);
  });

  test("Pi-hole uses standard port 80 without HTTPS", () => {
    const apps = [getApp("pihole")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {});

    expect(config).toContain(`url: http://${LOCAL_IP}:80`);
  });

  test("uses HTTPS subdomain URLs with cert check when HTTPS enabled", () => {
    const apps = [getApp("sonarr")!, getApp("pihole")!];
    const config = generateGatusConfig(apps, LOCAL_IP, {
      envConfig: httpsEnv,
    });

    // Uses HTTPS subdomain URLs instead of direct IP:port
    expect(config).toContain("url: https://sonarr.mylab.duckdns.org");
    expect(config).toContain("url: https://pihole.mylab.duckdns.org");
    expect(config).not.toContain(`url: http://${LOCAL_IP}`);

    // Both status and cert conditions on the same endpoint
    expect(config).toContain("[STATUS] == 200");
    expect(config).toContain("[CERTIFICATE_EXPIRATION] > 72h");
  });

  test("snapshot: full config with mixed apps", () => {
    const apps = [
      getApp("sonarr")!,
      getApp("immich")!,
      getApp("adventurelog")!,
    ];
    const config = generateGatusConfig(apps, LOCAL_IP, {
      username: "admin",
      passwordBcryptBase64: "dGVzdGhhc2g=",
      discordWebhook: "https://discord.com/api/webhooks/test",
    });

    expect(config).toMatchSnapshot();
  });

  test("snapshot: config with Pi-hole and HTTPS enabled", () => {
    const apps = [
      getApp("sonarr")!,
      getApp("pihole")!,
      getApp("adventurelog")!,
    ];
    const config = generateGatusConfig(apps, LOCAL_IP, {
      username: "admin",
      passwordBcryptBase64: "dGVzdGhhc2g=",
      envConfig: httpsEnv,
    });

    expect(config).toMatchSnapshot();
  });
});
