import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	cn,
	formatFileSize,
	formatRelativeTime,
	formatUptime,
	invalidateKeys,
	parseMemoryMB,
} from "../lib/utils";

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

describe("formatFileSize", () => {
	it("formats bytes in GB range", () => {
		expect(formatFileSize(1_073_741_824)).toBe("1.0 GB");
		expect(formatFileSize(2_684_354_560)).toBe("2.5 GB");
	});

	it("formats bytes in MB range", () => {
		expect(formatFileSize(1_048_576)).toBe("1.0 MB");
		expect(formatFileSize(524_288_000)).toBe("500.0 MB");
	});

	it("formats bytes in KB range", () => {
		expect(formatFileSize(1024)).toBe("1.0 KB");
		expect(formatFileSize(512_000)).toBe("500.0 KB");
	});

	it("formats raw bytes for small values", () => {
		expect(formatFileSize(0)).toBe("0 B");
		expect(formatFileSize(512)).toBe("512 B");
		expect(formatFileSize(1023)).toBe("1023 B");
	});

	it("uses correct thresholds at boundaries", () => {
		// Just below 1 KB
		expect(formatFileSize(1023)).toBe("1023 B");
		// Exactly 1 KB
		expect(formatFileSize(1024)).toBe("1.0 KB");
		// Just below 1 MB
		expect(formatFileSize(1_048_575)).toBe("1024.0 KB");
		// Exactly 1 MB
		expect(formatFileSize(1_048_576)).toBe("1.0 MB");
		// Just below 1 GB
		expect(formatFileSize(1_073_741_823)).toBe("1024.0 MB");
		// Exactly 1 GB
		expect(formatFileSize(1_073_741_824)).toBe("1.0 GB");
	});
});

describe("cn", () => {
	it("merges simple class names", () => {
		expect(cn("foo", "bar")).toBe("foo bar");
	});

	it("filters falsy values", () => {
		expect(cn("foo", false, null, undefined, "", "bar")).toBe("foo bar");
	});

	it("resolves conditional object syntax", () => {
		expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
	});

	it("flattens arrays", () => {
		expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
	});

	it("lets later tailwind classes override earlier conflicting ones", () => {
		expect(cn("p-2", "p-4")).toBe("p-4");
		expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
	});

	it("preserves non-conflicting tailwind classes", () => {
		expect(cn("p-2", "m-4")).toBe("p-2 m-4");
	});

	it("returns empty string for no inputs", () => {
		expect(cn()).toBe("");
	});
});

describe("formatRelativeTime", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns 'just now' for sub-minute deltas", () => {
		expect(formatRelativeTime(new Date("2026-03-23T11:59:30Z"))).toBe(
			"just now",
		);
	});

	it("returns 'just now' for the same instant", () => {
		expect(formatRelativeTime(new Date("2026-03-23T12:00:00Z"))).toBe(
			"just now",
		);
	});

	it("returns minutes for sub-hour deltas", () => {
		expect(formatRelativeTime(new Date("2026-03-23T11:45:00Z"))).toBe(
			"15m ago",
		);
	});

	it("returns hours for sub-day deltas", () => {
		expect(formatRelativeTime(new Date("2026-03-23T06:00:00Z"))).toBe("6h ago");
	});

	it("returns days for sub-month deltas", () => {
		expect(formatRelativeTime(new Date("2026-03-20T12:00:00Z"))).toBe("3d ago");
	});

	it("falls back to a locale date for older dates", () => {
		const result = formatRelativeTime(new Date("2025-12-01T12:00:00Z"));
		expect(result).not.toMatch(/ago$/);
		expect(result).not.toBe("just now");
	});

	it("crosses the 60-second boundary cleanly", () => {
		expect(formatRelativeTime(new Date("2026-03-23T11:59:00Z"))).toBe("1m ago");
	});

	it("crosses the 60-minute boundary cleanly", () => {
		expect(formatRelativeTime(new Date("2026-03-23T11:00:00Z"))).toBe("1h ago");
	});

	it("crosses the 24-hour boundary cleanly", () => {
		expect(formatRelativeTime(new Date("2026-03-22T12:00:00Z"))).toBe("1d ago");
	});
});

describe("invalidateKeys", () => {
	it("invalidates queries whose key starts with a provided prefix", async () => {
		const qc = new QueryClient();
		qc.setQueryData(["apps"], "a");
		qc.setQueryData(["apps", "detail"], "b");
		qc.setQueryData(["system"], "c");

		await invalidateKeys(qc, [["apps"]]);

		expect(qc.getQueryState(["apps"])?.isInvalidated).toBe(true);
		expect(qc.getQueryState(["apps", "detail"])?.isInvalidated).toBe(true);
		expect(qc.getQueryState(["system"])?.isInvalidated).toBe(false);
	});

	it("supports multiple prefix keys", async () => {
		const qc = new QueryClient();
		qc.setQueryData(["apps"], "a");
		qc.setQueryData(["backups"], "b");
		qc.setQueryData(["system"], "c");

		await invalidateKeys(qc, [["apps"], ["backups"]]);

		expect(qc.getQueryState(["apps"])?.isInvalidated).toBe(true);
		expect(qc.getQueryState(["backups"])?.isInvalidated).toBe(true);
		expect(qc.getQueryState(["system"])?.isInvalidated).toBe(false);
	});

	it("does not match when the prefix is longer than the query key", async () => {
		const qc = new QueryClient();
		qc.setQueryData(["apps"], "a");

		await invalidateKeys(qc, [["apps", "detail"]]);

		expect(qc.getQueryState(["apps"])?.isInvalidated).toBe(false);
	});

	it("matches segment-by-segment, not by substring", async () => {
		const qc = new QueryClient();
		qc.setQueryData(["application"], "a");
		qc.setQueryData(["apps"], "b");

		await invalidateKeys(qc, [["apps"]]);

		expect(qc.getQueryState(["application"])?.isInvalidated).toBe(false);
		expect(qc.getQueryState(["apps"])?.isInvalidated).toBe(true);
	});

	it("no-ops when no queries match", async () => {
		const qc = new QueryClient();
		qc.setQueryData(["apps"], "a");

		await invalidateKeys(qc, [["missing"]]);

		expect(qc.getQueryState(["apps"])?.isInvalidated).toBe(false);
	});
});
