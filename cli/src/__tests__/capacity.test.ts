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
    const result = getPerformanceVerdict(6, 8, 16384);
    expect(result.label).toBe("Comfortable");
    expect(result.color).toBe("green");
  });

  test("adequate with moderate resources", () => {
    const result = getPerformanceVerdict(12, 4, 8192);
    expect(result.label).toBe("Adequate");
    expect(result.color).toBe("yellow");
  });

  test("tight on a Raspberry Pi 5 4GB with 14 apps", () => {
    // 18 score, 4 cores, 4GB — realistic RPi5 scenario
    const result = getPerformanceVerdict(18, 4, 4096);
    expect(result.label).toBe("Tight");
    expect(result.color).toBe("red");
  });

  test("overloaded with very limited resources", () => {
    const result = getPerformanceVerdict(20, 2, 2048);
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

describe("formatBytes edge cases", () => {
  test("formats negative values", () => {
    const result = formatBytes(-1);
    expect(typeof result).toBe("string");
  });

  test("formats very large values beyond TB uses undefined unit", () => {
    const pb = 1024 * 1024 * 1024 * 1024 * 1024;
    const result = formatBytes(pb);
    expect(result).toContain("undefined");
  });

  test("formats exact boundaries", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
  });
});

describe("getPerformanceVerdict edge cases", () => {
  test("zero score with reasonable hardware is comfortable", () => {
    const result = getPerformanceVerdict(0, 4, 8192);
    expect(result.label).toBe("Comfortable");
  });

  test("very high score with powerful hardware", () => {
    const result = getPerformanceVerdict(30, 16, 65536);
    expect(result.label).toBe("Comfortable");
  });

  test("moderate score with minimal hardware", () => {
    const result = getPerformanceVerdict(10, 2, 2048);
    expect(result.label).not.toBe("Comfortable");
  });

  test("verdict always has label and color", () => {
    const testCases = [
      [0, 1, 512],
      [5, 2, 2048],
      [10, 4, 4096],
      [20, 8, 16384],
      [50, 16, 65536],
    ] as const;

    for (const [score, cores, ramMb] of testCases) {
      const result = getPerformanceVerdict(score, cores, ramMb);
      expect(result.label).toBeTruthy();
      expect(result.color).toBeTruthy();
      expect(["green", "yellow", "red"]).toContain(result.color);
    }
  });
});

describe("getStorageVerdict edge cases", () => {
  test("single mount at exact threshold boundaries", () => {
    const at60 = getStorageVerdict([
      { mountpoint: "/", totalBytes: 1000, usedBytes: 600, availBytes: 400 },
    ]);
    expect(["Moderate", "Healthy"]).toContain(at60.label);

    const at80 = getStorageVerdict([
      { mountpoint: "/", totalBytes: 1000, usedBytes: 800, availBytes: 200 },
    ]);
    expect(["Warning", "Moderate"]).toContain(at80.label);

    const at95 = getStorageVerdict([
      { mountpoint: "/", totalBytes: 1000, usedBytes: 950, availBytes: 50 },
    ]);
    expect(["Critical", "Warning"]).toContain(at95.label);
  });

  test("multiple mounts with varying usage", () => {
    const result = getStorageVerdict([
      { mountpoint: "/", totalBytes: 100000, usedBytes: 30000, availBytes: 70000 },
      { mountpoint: "/home", totalBytes: 100000, usedBytes: 50000, availBytes: 50000 },
      { mountpoint: "/data", totalBytes: 100000, usedBytes: 10000, availBytes: 90000 },
    ]);
    expect(result.label).toBeTruthy();
    expect(result.color).toBeTruthy();
  });

  test("mount with zero total bytes", () => {
    const result = getStorageVerdict([
      { mountpoint: "/", totalBytes: 0, usedBytes: 0, availBytes: 0 },
    ]);
    expect(result.label).toBeTruthy();
  });
});

describe("score mapping functions are consistent", () => {
  test("all capacity levels have corresponding numeric, label, and color", () => {
    const levels = ["low", "medium", "high"] as const;
    for (const level of levels) {
      expect(typeof scoreToNumeric(level)).toBe("number");
      expect(typeof scoreLabel(level)).toBe("string");
      expect(typeof scoreColor(level)).toBe("string");
    }
  });

  test("numeric values are ordered", () => {
    expect(scoreToNumeric("low")).toBeLessThan(scoreToNumeric("medium"));
    expect(scoreToNumeric("medium")).toBeLessThan(scoreToNumeric("high"));
  });
});

describe("capacity notes", () => {
  test("high-performance apps have capacity notes", () => {
    const highPerf = APP_REGISTRY.filter(
      (app) => app.capacity?.performance === "high",
    );
    for (const app of highPerf) {
      expect(app.capacity!.note).toBeTruthy();
    }
  });
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
