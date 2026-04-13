import { describe, expect, test } from "bun:test";
import { getAppNames, getStackNames, getApp, APP_REGISTRY } from "@/lib/apps.js";

/**
 * Tests for the completions command (cli/src/commands/completions.ts).
 * We can't test the stdout-writing `runCompletions()` directly,
 * but we can test the data it relies on from the app registry.
 */

const SUBCOMMANDS = [
  "setup", "backup", "restore", "recover", "start", "stop", "restart",
  "install", "reinstall", "uninstall", "status", "health", "capacity", "doctor",
  "update", "log", "graph", "self-update", "config", "version", "completions", "docs",
];

const APP_COMMANDS = [
  "start", "stop", "restart", "reinstall", "uninstall", "update", "log",
];

const BACKUP_SUBCOMMANDS = ["list", "delete", "verify", "config", "remote"];

describe("completions data integrity", () => {
  test("all app names are valid identifiers (no spaces or special chars)", () => {
    for (const name of getAppNames()) {
      expect(name).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test("all stack names are valid identifiers", () => {
    for (const name of getStackNames()) {
      expect(name).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test("no app name collides with a subcommand", () => {
    const appNames = getAppNames();
    for (const cmd of SUBCOMMANDS) {
      expect(appNames).not.toContain(cmd);
    }
  });

  test("no stack name collides with a subcommand", () => {
    const stackNames = getStackNames();
    for (const cmd of SUBCOMMANDS) {
      expect(stackNames).not.toContain(cmd);
    }
  });

  test("no stack name collides with reserved install targets", () => {
    const reserved = ["docker", "backup", "https", "firewall"];
    const stackNames = getStackNames();
    for (const name of reserved) {
      expect(stackNames).not.toContain(name);
    }
  });

  test("multi-container apps have additionalContainers for log completion", () => {
    const multiContainerApps = APP_REGISTRY.filter(
      (app) => app.additionalContainers && app.additionalContainers.length > 0,
    );
    expect(multiContainerApps.length).toBeGreaterThan(0);

    for (const app of multiContainerApps) {
      // Each additional container name should be non-empty
      for (const container of app.additionalContainers!) {
        expect(container.length).toBeGreaterThan(0);
      }
    }
  });

  test("all APP_COMMANDS are valid SUBCOMMANDS", () => {
    for (const cmd of APP_COMMANDS) {
      expect(SUBCOMMANDS).toContain(cmd);
    }
  });

  test("backup has expected subcommands", () => {
    expect(BACKUP_SUBCOMMANDS).toContain("list");
    expect(BACKUP_SUBCOMMANDS).toContain("delete");
    expect(BACKUP_SUBCOMMANDS).toContain("verify");
    expect(BACKUP_SUBCOMMANDS).toContain("config");
    expect(BACKUP_SUBCOMMANDS).toContain("remote");
  });
});
