import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { deregisterSsoClient, registerSsoClient } from "@/lib/sso.js";
import type { AppDefinition, EnvConfig } from "@/types.js";

const baseApp: AppDefinition = {
  name: "immich",
  displayName: "Immich",
  description: "Photos",
  image: "ghcr.io/immich-app/immich-server:release",
  icon: "https://example.com/immich.png",
  port: 2283,
  configSubdir: "config",
  needsDataDir: false,
};

const appWithOauth: AppDefinition = {
  ...baseApp,
  oauth: {
    clientId: "immich",
    displayName: "Immich",
    envMapping: {
      issuerUrl: "OAUTH_ISSUER_URL",
      clientId: "OAUTH_CLIENT_ID",
      clientSecret: "OAUTH_CLIENT_SECRET",
    },
    redirectUris: (domain) => [
      `https://immich.${domain}/auth/login`,
      "app.immich:///oauth-callback",
    ],
  },
};

const envWithDomain: EnvConfig = {
  BASE_DIR: "/opt/homelab",
  PUID: "1000",
  PGID: "1000",
  TZ: "Etc/UTC",
  DUCKDNS_SUBDOMAINS: "mylab",
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("registerSsoClient", () => {
  test("returns null when app has no oauth config", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response("")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await registerSsoClient(baseApp, envWithDomain);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns null when DUCKDNS_SUBDOMAINS is missing", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response("")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const env: EnvConfig = { ...envWithDomain, DUCKDNS_SUBDOMAINS: undefined };
    const result = await registerSsoClient(appWithOauth, env);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns null when DUCKDNS_SUBDOMAINS is empty string", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response("")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await registerSsoClient(appWithOauth, {
      ...envWithDomain,
      DUCKDNS_SUBDOMAINS: "",
    });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("POSTs to /api/sso/clients with correct body and returns credentials", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ clientId: "immich", clientSecret: "s3cret" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await registerSsoClient(appWithOauth, envWithDomain);

    expect(result).toEqual({ clientId: "immich", clientSecret: "s3cret" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/api/sso/clients");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      clientId: "immich",
      clientName: "Immich",
      redirectUris: [
        "https://immich.mylab.duckdns.org/auth/login",
        "app.immich:///oauth-callback",
      ],
      icon: "https://example.com/immich.png",
    });
  });

  test("uses the first subdomain when DUCKDNS_SUBDOMAINS has multiple comma-separated values", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ clientId: "immich", clientSecret: "s3cret" }),
          { status: 200 },
        ),
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await registerSsoClient(appWithOauth, {
      ...envWithDomain,
      DUCKDNS_SUBDOMAINS: " primary , secondary ",
    });

    const body = JSON.parse(
      ((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1])
        .body as string,
    );
    expect(body.redirectUris[0]).toBe(
      "https://immich.primary.duckdns.org/auth/login",
    );
  });

  test("returns null on non-ok response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("forbidden", { status: 403 })),
    ) as unknown as typeof fetch;

    const result = await registerSsoClient(appWithOauth, envWithDomain);

    expect(result).toBeNull();
  });

  test("returns null when fetch throws (UI unreachable)", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("ECONNREFUSED")),
    ) as unknown as typeof fetch;

    const result = await registerSsoClient(appWithOauth, envWithDomain);

    expect(result).toBeNull();
  });
});

describe("deregisterSsoClient", () => {
  test("returns false when app has no oauth config", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response("")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await deregisterSsoClient(baseApp);

    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("DELETEs the client by id and returns true on success", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response("", { status: 204 })),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await deregisterSsoClient(appWithOauth);

    expect(result).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/api/sso/clients/immich");
    expect(init.method).toBe("DELETE");
  });

  test("returns false on non-ok response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("nope", { status: 404 })),
    ) as unknown as typeof fetch;

    expect(await deregisterSsoClient(appWithOauth)).toBe(false);
  });

  test("returns false when fetch throws", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("network down")),
    ) as unknown as typeof fetch;

    expect(await deregisterSsoClient(appWithOauth)).toBe(false);
  });
});
