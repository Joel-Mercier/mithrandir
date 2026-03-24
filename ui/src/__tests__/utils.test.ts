import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatUptime, parseMemoryMB } from "../lib/utils";

describe("formatUptime", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns days and hours for multi-day uptime", () => {
		expect(formatUptime("2026-03-20T00:00:00Z")).toBe("3d 12h");
	});

	it("returns days and 0h when exactly on the day boundary", () => {
		expect(formatUptime("2026-03-21T12:00:00Z")).toBe("2d 0h");
	});

	it("returns hours for sub-day uptime", () => {
		expect(formatUptime("2026-03-23T06:00:00Z")).toBe("6h");
	});

	it("returns minutes for sub-hour uptime", () => {
		expect(formatUptime("2026-03-23T11:45:00Z")).toBe("15m");
	});

	it("returns 0m for just-started container", () => {
		expect(formatUptime("2026-03-23T12:00:00Z")).toBe("0m");
	});

	it("returns 1d 0h for exactly 24 hours", () => {
		expect(formatUptime("2026-03-22T12:00:00Z")).toBe("1d 0h");
	});
});

describe("parseMemoryMB", () => {
	it("parses GiB to MB", () => {
		expect(parseMemoryMB("2.5GiB")).toBe(2560);
	});

	it("parses GB to MB", () => {
		expect(parseMemoryMB("1GB")).toBe(1024);
	});

	it("parses MiB as MB", () => {
		expect(parseMemoryMB("512MiB")).toBe(512);
	});

	it("parses MB as MB", () => {
		expect(parseMemoryMB("256MB")).toBe(256);
	});

	it("parses KiB to MB", () => {
		expect(parseMemoryMB("1024KiB")).toBe(1);
	});

	it("parses KB to MB", () => {
		expect(parseMemoryMB("2048KB")).toBe(2);
	});

	it("handles space between number and unit", () => {
		expect(parseMemoryMB("4 GiB")).toBe(4096);
	});

	it("returns 0 for empty string", () => {
		expect(parseMemoryMB("")).toBe(0);
	});

	it("returns 0 for non-matching input", () => {
		expect(parseMemoryMB("—")).toBe(0);
	});

	it("returns raw number for unknown unit", () => {
		expect(parseMemoryMB("100B")).toBe(100);
	});
});
