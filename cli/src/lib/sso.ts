/**
 * SSO client management — CLI ↔ UI communication for OAuth client registration.
 * Calls the UI's localhost-only API to register/deregister OAuth clients.
 */
import type { AppDefinition, EnvConfig } from "../types.js";

const UI_PORT = 3000;
const UI_BASE = `http://localhost:${UI_PORT}`;

/** Register an OAuth client with the UI for an app that supports SSO */
export async function registerSsoClient(
  app: AppDefinition,
  env: EnvConfig,
): Promise<{ clientId: string; clientSecret: string } | null> {
  if (!app.oauth) return null;

  const domain = env.DUCKDNS_SUBDOMAINS?.split(",")[0]?.trim();
  if (!domain) return null;

  const redirectUris = app.oauth.redirectUris(`${domain}.duckdns.org`);

  try {
    const res = await fetch(`${UI_BASE}/api/sso/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: app.oauth.clientId,
        clientName: app.oauth.displayName,
        redirectUris,
        icon: app.icon,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      clientId: string;
      clientSecret: string;
    };
    return data;
  } catch {
    return null;
  }
}

/** Remove an OAuth client registration when an app is uninstalled */
export async function deregisterSsoClient(
  app: AppDefinition,
): Promise<boolean> {
  if (!app.oauth) return false;

  try {
    const res = await fetch(
      `${UI_BASE}/api/sso/clients/${app.oauth.clientId}`,
      {
        method: "DELETE",
        signal: AbortSignal.timeout(5000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
