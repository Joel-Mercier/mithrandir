import { describe, expect, it } from "vitest";
import { TIMEZONES } from "../lib/timezones";

describe("TIMEZONES", () => {
	it("exposes the expected top-level regions", () => {
		expect(Object.keys(TIMEZONES).sort()).toEqual(
			[
				"Africa",
				"America",
				"Antarctica",
				"Arctic",
				"Asia",
				"Atlantic",
				"Australia",
				"Brazil",
				"Canada",
				"Chile",
				"Etc",
				"Europe",
				"Indian",
				"Mexico",
				"Other",
				"Pacific",
				"US",
			].sort(),
		);
	});

	it("has non-empty lists for every region", () => {
		for (const [region, zones] of Object.entries(TIMEZONES)) {
			expect(zones.length, `region ${region} should not be empty`).toBeGreaterThan(0);
		}
	});

	it("prefixes each zone with its region (except the 'Other' bucket)", () => {
		for (const [region, zones] of Object.entries(TIMEZONES)) {
			if (region === "Other") continue;
			for (const zone of zones) {
				expect(zone.startsWith(`${region}/`)).toBe(true);
			}
		}
	});

	it("contains no duplicate zones within any region", () => {
		for (const [region, zones] of Object.entries(TIMEZONES)) {
			expect(new Set(zones).size, `region ${region} has duplicates`).toBe(
				zones.length,
			);
		}
	});

	it("includes common canonical zones", () => {
		expect(TIMEZONES.Europe).toContain("Europe/Paris");
		expect(TIMEZONES.America).toContain("America/New_York");
		expect(TIMEZONES.Asia).toContain("Asia/Tokyo");
		expect(TIMEZONES.Etc).toContain("Etc/UTC");
		expect(TIMEZONES.Pacific).toContain("Pacific/Auckland");
	});

	it("keeps the 'Other' bucket free of region-prefixed zones", () => {
		for (const zone of TIMEZONES.Other) {
			expect(zone.includes("/")).toBe(false);
		}
	});

	it("exposes a large, realistic zone count overall", () => {
		const total = Object.values(TIMEZONES).reduce(
			(sum, list) => sum + list.length,
			0,
		);
		expect(total).toBeGreaterThan(400);
	});
});
