import { describe, expect, test } from "bun:test";
import { formatSwapSize } from "@/lib/swap.js";

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;
const KB = 1024;

describe("formatSwapSize", () => {
  test("formats gigabytes", () => {
    expect(formatSwapSize(1 * GB)).toBe("1.0 GB");
    expect(formatSwapSize(2 * GB)).toBe("2.0 GB");
    expect(formatSwapSize(4.5 * GB)).toBe("4.5 GB");
  });

  test("formats fractional gigabytes", () => {
    expect(formatSwapSize(1.5 * GB)).toBe("1.5 GB");
    expect(formatSwapSize(2.25 * GB)).toBe("2.3 GB");
  });

  test("formats megabytes for sub-GB values", () => {
    expect(formatSwapSize(512 * MB)).toBe("512 MB");
    expect(formatSwapSize(256 * MB)).toBe("256 MB");
  });

  test("formats small values", () => {
    expect(formatSwapSize(1 * MB)).toBe("1 MB");
  });

  test("formats zero", () => {
    expect(formatSwapSize(0)).toBe("0 MB");
  });

  test("threshold is exactly 1 GB", () => {
    // Exactly 1 GB should use GB format
    expect(formatSwapSize(GB)).toBe("1.0 GB");
    // Just under 1 GB should use MB format
    expect(formatSwapSize(GB - 1)).toBe("1024 MB");
  });

  test("handles very large swap (16 GB)", () => {
    expect(formatSwapSize(16 * GB)).toBe("16.0 GB");
  });

  test("handles very small values (1 KB)", () => {
    expect(formatSwapSize(1 * KB)).toBe("0 MB");
  });

  test("handles fractional megabytes", () => {
    const result = formatSwapSize(1.5 * MB);
    expect(result).toMatch(/^\d+ MB$/);
  });

  test("precise GB formatting", () => {
    expect(formatSwapSize(3.14 * GB)).toBe("3.1 GB");
  });

  test("negative value handled gracefully", () => {
    const result = formatSwapSize(-1 * MB);
    expect(typeof result).toBe("string");
  });

  test("just above 1 GB threshold", () => {
    expect(formatSwapSize(GB + 1)).toBe("1.0 GB");
  });
});
