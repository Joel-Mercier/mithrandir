import { describe, expect, it } from "vitest";
import { resolve } from "path";
import { getProjectRoot } from "../lib/server/utils";

describe("getProjectRoot", () => {
	it("resolves to the monorepo root (parent of ui/)", () => {
		const root = getProjectRoot();
		// The ui workspace is at <root>/ui, so getProjectRoot should return <root>
		expect(root).toBe(resolve(__dirname, "../../.."));
	});

	it("returns an absolute path", () => {
		const root = getProjectRoot();
		expect(root.startsWith("/")).toBe(true);
	});

	it("does not end with a trailing slash", () => {
		const root = getProjectRoot();
		expect(root.endsWith("/")).toBe(false);
	});
});
