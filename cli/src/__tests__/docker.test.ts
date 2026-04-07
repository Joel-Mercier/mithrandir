import { describe, expect, test } from "bun:test";
import { parseSize } from "@/lib/docker.js";

describe("parseSize", () => {
  test("parses GB", () => {
    expect(parseSize("1.5GB")).toBe(1.5 * 1024 * 1024 * 1024);
  });

  test("parses MB", () => {
    expect(parseSize("256MB")).toBe(256 * 1024 * 1024);
  });

  test("parses KB", () => {
    expect(parseSize("512KB")).toBe(512 * 1024);
  });

  test("parses plain bytes (no unit)", () => {
    expect(parseSize("1024")).toBe(1024);
  });

  test("parses fractional MB", () => {
    expect(parseSize("1.23MB")).toBe(1.23 * 1024 * 1024);
  });

  test("parses zero", () => {
    expect(parseSize("0")).toBe(0);
  });

  test("handles lowercase units", () => {
    expect(parseSize("10mb")).toBe(10 * 1024 * 1024);
    expect(parseSize("5gb")).toBe(5 * 1024 * 1024 * 1024);
    expect(parseSize("100kb")).toBe(100 * 1024);
  });

  test("handles size with space before unit", () => {
    expect(parseSize("256 MB")).toBe(256 * 1024 * 1024);
  });

  test("returns 0 for empty string", () => {
    expect(parseSize("")).toBe(0);
  });

  test("returns 0 for non-numeric string", () => {
    expect(parseSize("abc")).toBe(0);
  });
});
