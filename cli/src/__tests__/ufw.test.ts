import { describe, expect, test } from "bun:test";
import { getAppPorts } from "@/lib/ufw.js";
import { getApp, APP_REGISTRY } from "@/lib/apps.js";
import type { AppDefinition } from "@/types.js";

/** Minimal app stub for testing */
function stubApp(overrides: Partial<AppDefinition> = {}): AppDefinition {
  return {
    name: "test-app",
    displayName: "Test App",
    description: "A test app",
    image: "test:latest",
    port: null,
    configSubdir: "config",
    needsDataDir: false,
    ...overrides,
  } as AppDefinition;
}

describe("getAppPorts", () => {
  test("returns empty array for app with no port", () => {
    const app = stubApp({ port: null });
    expect(getAppPorts(app)).toEqual([]);
  });

  test("returns main port as tcp for bridge-networked app", () => {
    const app = stubApp({ port: 8080 });
    expect(getAppPorts(app)).toEqual([
      { port: 8080, protocol: "tcp", isHostNetwork: false },
    ]);
  });

  test("marks host-networked app correctly", () => {
    const app = stubApp({ port: 8123, networkMode: "host" });
    expect(getAppPorts(app)).toEqual([
      { port: 8123, protocol: "tcp", isHostNetwork: true },
    ]);
  });

  test("includes extra ports", () => {
    const app = stubApp({
      port: 8080,
      extraPorts: [
        { host: 443, container: 443, protocol: "tcp" },
        { host: 53, container: 53, protocol: "udp" },
      ],
    });
    const ports = getAppPorts(app);
    expect(ports).toEqual([
      { port: 8080, protocol: "tcp", isHostNetwork: false },
      { port: 443, protocol: "tcp", isHostNetwork: false },
      { port: 53, protocol: "udp", isHostNetwork: false },
    ]);
  });

  test("extra ports default to tcp when protocol is not specified", () => {
    const app = stubApp({
      port: null,
      extraPorts: [{ host: 9090, container: 9090 }],
    });
    const ports = getAppPorts(app);
    expect(ports).toEqual([
      { port: 9090, protocol: "tcp", isHostNetwork: false },
    ]);
  });

  test("host network applies to all ports including extras", () => {
    const app = stubApp({
      port: 8123,
      networkMode: "host",
      extraPorts: [{ host: 5353, container: 5353, protocol: "udp" }],
    });
    const ports = getAppPorts(app);
    expect(ports).toHaveLength(2);
    expect(ports.every((p) => p.isHostNetwork)).toBe(true);
  });
});

describe("getAppPorts with real registry apps", () => {
  test("Pi-hole has main port and extra ports", () => {
    const pihole = getApp("pihole")!;
    const ports = getAppPorts(pihole);
    expect(ports.length).toBeGreaterThan(1);
    const udp53 = ports.find((p) => p.port === 53 && p.protocol === "udp");
    expect(udp53).toBeDefined();
  });

  test("Home Assistant is host-networked", () => {
    const ha = getApp("homeassistant")!;
    expect(ha.networkMode).toBe("host");
    const ports = getAppPorts(ha);
    expect(ports.length).toBeGreaterThan(0);
    expect(ports[0].isHostNetwork).toBe(true);
  });

  test("DuckDNS has no ports", () => {
    const duckdns = getApp("duckdns")!;
    expect(duckdns.port).toBeNull();
    const ports = getAppPorts(duckdns);
    expect(ports).toEqual([]);
  });

  test("WireGuard has port and extra UDP ports", () => {
    const wg = getApp("wireguard")!;
    const ports = getAppPorts(wg);
    expect(ports.length).toBeGreaterThan(0);
    const udpPort = ports.find((p) => p.protocol === "udp");
    expect(udpPort).toBeDefined();
  });

  test("Sonarr has single TCP port", () => {
    const sonarr = getApp("sonarr")!;
    const ports = getAppPorts(sonarr);
    expect(ports).toEqual([
      { port: 8989, protocol: "tcp", isHostNetwork: false },
    ]);
  });
});

describe("getAppPorts protocol handling", () => {
  test("multiple mixed protocols", () => {
    const app = stubApp({
      port: 8080,
      extraPorts: [
        { host: 53, container: 53, protocol: "udp" },
        { host: 53, container: 53, protocol: "tcp" },
        { host: 443, container: 443 },
      ],
    });
    const ports = getAppPorts(app);
    expect(ports).toHaveLength(4);

    const udpPorts = ports.filter((p) => p.protocol === "udp");
    expect(udpPorts).toHaveLength(1);

    const tcpPorts = ports.filter((p) => p.protocol === "tcp");
    expect(tcpPorts).toHaveLength(3);
  });

  test("all registry apps produce valid port entries", () => {
    for (const app of APP_REGISTRY) {
      const ports = getAppPorts(app);
      for (const entry of ports) {
        expect(entry.port).toBeGreaterThan(0);
        expect(["tcp", "udp"]).toContain(entry.protocol);
        expect(typeof entry.isHostNetwork).toBe("boolean");
      }
    }
  });
});
