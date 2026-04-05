import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, symlinkSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getActiveSlot, getInactiveSlot, hasValidDeployment } from "@/lib/deploy-ui.js";

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `deploy-ui-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("getActiveSlot", () => {
  test("defaults to blue when no symlink exists", () => {
    expect(getActiveSlot(testDir)).toBe("blue");
  });

  test("returns blue when symlink points to blue", () => {
    const deploymentsDir = join(testDir, ".deployments");
    mkdirSync(deploymentsDir, { recursive: true });
    symlinkSync("blue", join(deploymentsDir, "current"));
    expect(getActiveSlot(testDir)).toBe("blue");
  });

  test("returns green when symlink points to green", () => {
    const deploymentsDir = join(testDir, ".deployments");
    mkdirSync(deploymentsDir, { recursive: true });
    symlinkSync("green", join(deploymentsDir, "current"));
    expect(getActiveSlot(testDir)).toBe("green");
  });

  test("defaults to blue for invalid symlink target", () => {
    const deploymentsDir = join(testDir, ".deployments");
    mkdirSync(deploymentsDir, { recursive: true });
    symlinkSync("invalid", join(deploymentsDir, "current"));
    expect(getActiveSlot(testDir)).toBe("blue");
  });
});

describe("getInactiveSlot", () => {
  test("returns green when active is blue (default)", () => {
    expect(getInactiveSlot(testDir)).toBe("green");
  });

  test("returns blue when active is green", () => {
    const deploymentsDir = join(testDir, ".deployments");
    mkdirSync(deploymentsDir, { recursive: true });
    symlinkSync("green", join(deploymentsDir, "current"));
    expect(getInactiveSlot(testDir)).toBe("blue");
  });

  test("returns green when active is blue", () => {
    const deploymentsDir = join(testDir, ".deployments");
    mkdirSync(deploymentsDir, { recursive: true });
    symlinkSync("blue", join(deploymentsDir, "current"));
    expect(getInactiveSlot(testDir)).toBe("green");
  });
});

describe("hasValidDeployment", () => {
  test("returns false when no deployments directory exists", () => {
    expect(hasValidDeployment(testDir)).toBe(false);
  });

  test("returns false when current symlink exists but no server entry", () => {
    const deploymentsDir = join(testDir, ".deployments");
    const blueDir = join(deploymentsDir, "blue");
    mkdirSync(blueDir, { recursive: true });
    symlinkSync("blue", join(deploymentsDir, "current"));
    expect(hasValidDeployment(testDir)).toBe(false);
  });

  test("returns true when current points to a valid build", () => {
    const deploymentsDir = join(testDir, ".deployments");
    const blueDir = join(deploymentsDir, "blue", "server");
    mkdirSync(blueDir, { recursive: true });
    writeFileSync(join(blueDir, "index.mjs"), "// server entry");
    symlinkSync("blue", join(deploymentsDir, "current"));
    expect(hasValidDeployment(testDir)).toBe(true);
  });

  test("returns false when current points to slot without index.mjs", () => {
    const deploymentsDir = join(testDir, ".deployments");
    const greenDir = join(deploymentsDir, "green", "server");
    mkdirSync(greenDir, { recursive: true });
    // index.mjs missing
    symlinkSync("green", join(deploymentsDir, "current"));
    expect(hasValidDeployment(testDir)).toBe(false);
  });
});
