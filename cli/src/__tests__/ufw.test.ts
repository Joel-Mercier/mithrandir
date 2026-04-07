import { describe, expect, test } from "bun:test";
import { getAppPorts } from "@/lib/ufw.js";
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
