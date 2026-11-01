import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  BYPARR_PROXY_TAG,
  createProwlarrClient,
  ensureByparrProxy,
  type IndexerProxyResource,
  type TagResource,
} from "@/lib/prowlarr.js";

const API_KEY = "test-key";
const BYPARR_URL = "http://192.168.1.10:8192";

/** Minimal in-memory Prowlarr: tag + indexerproxy endpoints */
const state = {
  tags: [] as TagResource[],
  proxies: [] as IndexerProxyResource[],
  /** forceSave query value of each indexer proxy create call */
  createForceSave: [] as string[],
};

// Shape of Prowlarr's FlareSolverr schema entry (trimmed)
const flareSolverrSchema: IndexerProxyResource = {
  id: 0,
  name: "",
  implementation: "FlareSolverr",
  implementationName: "FlareSolverr",
  configContract: "FlareSolverrSettings",
  tags: [],
  presets: [],
  fields: [
    { order: 0, name: "host", label: "Host", value: "http://localhost:8191/", type: "textbox" },
    { order: 2, name: "requestTimeout", label: "Request Timeout", value: 60, type: "number", advanced: true },
  ],
};

let server: ReturnType<typeof Bun.serve>;
let client: ReturnType<typeof createProwlarrClient>;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      if (req.headers.get("X-Api-Key") !== API_KEY) return new Response("unauthorized", { status: 401 });
      const url = new URL(req.url);
      const json = (data: unknown, status = 200) => Response.json(data, { status });

      if (url.pathname === "/api/v1/tag") {
        if (req.method === "GET") return json(state.tags);
        const body = (await req.json()) as TagResource;
        const tag = { id: state.tags.length + 1, label: body.label };
        state.tags.push(tag);
        return json(tag, 201);
      }
      if (url.pathname === "/api/v1/indexerproxy/schema") return json([flareSolverrSchema]);
      if (url.pathname === "/api/v1/indexerproxy") {
        if (req.method === "GET") return json(state.proxies);
        state.createForceSave.push(url.searchParams.get("forceSave") ?? "");
        const body = (await req.json()) as IndexerProxyResource;
        const proxy = { ...body, id: state.proxies.length + 1 };
        state.proxies.push(proxy);
        return json(proxy, 201);
      }
      return new Response("not found", { status: 404 });
    },
  });
  client = createProwlarrClient({ apiKey: API_KEY, baseUrl: `http://localhost:${server.port}` });
});

afterAll(() => {
  server.stop(true);
});

beforeEach(() => {
  state.tags = [];
  state.proxies = [];
  state.createForceSave = [];
});

describe("ensureByparrProxy", () => {
  test("creates the byparr tag and a FlareSolverr-type proxy pointing at Byparr", async () => {
    expect(await ensureByparrProxy(client, BYPARR_URL)).toBe("created");

    expect(state.tags).toEqual([{ id: 1, label: BYPARR_PROXY_TAG }]);
    expect(state.proxies.length).toBe(1);
    const proxy = state.proxies[0];
    expect(proxy.name).toBe("Byparr");
    expect(proxy.implementation).toBe("FlareSolverr");
    expect(proxy.configContract).toBe("FlareSolverrSettings");
    expect(proxy.tags).toEqual([1]);
    expect(proxy.fields?.find((f) => f.name === "host")?.value).toBe(BYPARR_URL);
    expect(proxy.fields?.find((f) => f.name === "requestTimeout")?.value).toBe(60);
    // Schema-only properties are not sent back
    expect(proxy.presets).toBeUndefined();
    expect(state.createForceSave).toEqual(["true"]);
  });

  test("is idempotent", async () => {
    await ensureByparrProxy(client, BYPARR_URL);
    expect(await ensureByparrProxy(client, BYPARR_URL)).toBe("exists");
    expect(state.proxies.length).toBe(1);
    expect(state.tags.length).toBe(1);
  });

  test("reuses an existing byparr tag", async () => {
    state.tags = [{ id: 1, label: "flaresolverr" }, { id: 7, label: "Byparr" }];
    await ensureByparrProxy(client, BYPARR_URL);
    expect(state.tags.length).toBe(2);
    expect(state.proxies[0].tags).toEqual([7]);
  });

  test("detects a manually added proxy targeting Byparr under another name", async () => {
    state.proxies = [{
      ...flareSolverrSchema,
      id: 3,
      name: "cloudflare",
      fields: [{ order: 0, name: "host", label: "Host", value: `${BYPARR_URL}/` }],
    }];
    expect(await ensureByparrProxy(client, BYPARR_URL)).toBe("exists");
    expect(state.proxies.length).toBe(1);
  });

  test("leaves a legacy FlareSolverr proxy alone and adds Byparr next to it", async () => {
    state.tags = [{ id: 1, label: "flaresolverr" }];
    state.proxies = [{
      ...flareSolverrSchema,
      id: 1,
      name: "Flaresolverr",
      tags: [1],
      fields: [{ order: 0, name: "host", label: "Host", value: "http://192.168.1.10:8191" }],
    }];
    expect(await ensureByparrProxy(client, BYPARR_URL)).toBe("created");
    expect(state.proxies.length).toBe(2);
    expect(state.proxies[0].name).toBe("Flaresolverr");
    expect(state.proxies[0].tags).toEqual([1]);
    expect(state.proxies[1].tags).toEqual([2]);
  });
});
