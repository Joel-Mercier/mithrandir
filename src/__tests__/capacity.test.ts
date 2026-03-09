import { describe, expect, test } from "bun:test";
import {
  scoreToNumeric,
  scoreLabel,
  scoreColor,
  getPerformanceVerdict,
  getStorageVerdict,
  formatBytes,
} from "@/lib/capacity.js";
import { APP_REGISTRY } from "@/lib/apps.js";

describe("scoreToNumeric", () => {
  test("maps low to 1", () => expect(scoreToNumeric("low")).toBe(1));
  test("maps medium to 2", () => expect(scoreToNumeric("medium")).toBe(2));
  test("maps high to 3", () => expect(scoreToNumeric("high")).toBe(3));
});

describe("scoreLabel", () => {
  test("maps low to Low", () => expect(scoreLabel("low")).toBe("Low"));
  test("maps medium to Medium", () => expect(scoreLabel("medium")).toBe("Medium"));
  test("maps high to High", () => expect(scoreLabel("high")).toBe("High"));
});

describe("scoreColor", () => {
  test("maps low to green", () => expect(scoreColor("low")).toBe("green"));
  test("maps medium to yellow", () => expect(scoreColor("medium")).toBe("yellow"));
  test("maps high to red", () => expect(scoreColor("high")).toBe("red"));
});

describe("getPerformanceVerdict", () => {
  test("comfortable with plenty of resources", () => {
    const result = getPerformanceVerdict(3, 8, 16384);
    expect(result.label).toBe("Comfortable");
    expect(result.color).toBe("green");
  });

  test("adequate with moderate resources", () => {
    const result = getPerformanceVerdict(6, 4, 4096);
    expect(result.label).toBe("Adequate");
    expect(result.color).toBe("yellow");
  });

  test("tight with limited resources", () => {
    const result = getPerformanceVerdict(8, 4, 2048);
    expect(result.label).toBe("Tight");
    expect(result.color).toBe("red");
  });

  test("overloaded with very limited resources", () => {
    const result = getPerformanceVerdict(10, 2, 2048);
    expect(result.label).toBe("Overloaded");
    expect(result.color).toBe("red");
  });
});

describe("getStorageVerdict", () => {
  test("healthy when under 60%", () => {
    const result = getStorageVerdict([
      { mountpoint: "/", totalBytes: 1000, usedBytes: 400, availBytes: 600 },
    ]);
    expect(result.label).toBe("Healthy");
    expect(result.color).toBe("green");
  });

  test("moderate when 60-80%", () => {
    const result = getStorageVerdict([
      { mountpoint: "/", totalBytes: 1000, usedBytes: 700, availBytes: 300 },
    ]);
    expect(result.label).toBe("Moderate");
    expect(result.color).toBe("yellow");
  });

  test("warning when 80-95%", () => {
    const result = getStorageVerdict([
      { mountpoint: "/", totalBytes: 1000, usedBytes: 900, availBytes: 100 },
    ]);
    expect(result.label).toBe("Warning");
    expect(result.color).toBe("yellow");
  });

  test("critical when over 95%", () => {
    const result = getStorageVerdict([
      { mountpoint: "/", totalBytes: 1000, usedBytes: 960, availBytes: 40 },
    ]);
    expect(result.label).toBe("Critical");
    expect(result.color).toBe("red");
  });

  test("unknown with no storage info", () => {
    const result = getStorageVerdict([]);
    expect(result.label).toBe("Unknown");
  });

  test("uses worst mount point", () => {
    const result = getStorageVerdict([
      { mountpoint: "/", totalBytes: 1000, usedBytes: 300, availBytes: 700 },
      { mountpoint: "/backups", totalBytes: 1000, usedBytes: 950, availBytes: 50 },
    ]);
    expect(result.label).toBe("Critical");
  });
});

describe("formatBytes", () => {
  test("formats zero", () => expect(formatBytes(0)).toBe("0 B"));
  test("formats bytes", () => expect(formatBytes(512)).toBe("512 B"));
  test("formats KB", () => expect(formatBytes(1024)).toBe("1.0 KB"));
  test("formats MB", () => expect(formatBytes(1024 * 1024)).toBe("1.0 MB"));
  test("formats GB", () => expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB"));
  test("formats TB", () => expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1.0 TB"));
  test("formats fractional GB", () => expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB"));
});

describe("registry capacity integrity", () => {
  test("all non-companion apps have capacity defined", () => {
    const nonCompanion = APP_REGISTRY.filter((app) => !app.companionOf);
    for (const app of nonCompanion) {
      expect(app.capacity).toBeDefined();
      expect(["low", "medium", "high"]).toContain(app.capacity!.performance);
      expect(["low", "medium", "high"]).toContain(app.capacity!.storage);
    }
  });

  test("companion apps also have capacity defined", () => {
    const companions = APP_REGISTRY.filter((app) => app.companionOf);
    for (const app of companions) {
      expect(app.capacity).toBeDefined();
    }
  });
});
