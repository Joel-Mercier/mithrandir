import { existsSync } from "node:fs";
import { APP_REGISTRY, getComposePath } from "@mithrandir/cli/lib/apps";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import { eq } from "drizzle-orm";
import { oauthClient } from "#/db/schema";
import db from "#/lib/db";
import { getProjectRoot } from "./utils";

/** Apps in the registry that support SSO (have an oauth field in their definition) */
function getSsoCapableApps() {
	return APP_REGISTRY.filter((app) => "oauth" in app && app.oauth);
}

/**
 * Reconcile OAuth clients with installed apps.
 * - Register missing clients for installed SSO-capable apps
 * - Remove stale clients for uninstalled apps
 */
export async function reconcileSsoClients() {
	const projectRoot = getProjectRoot();
	const envConfig = await loadEnvConfig(projectRoot);

	if (envConfig.ENABLE_SSO !== "true") return;

	const ssoApps = getSsoCapableApps();
	const baseDir = envConfig.BASE_DIR;

	// Find which SSO-capable apps are installed
	const installedSsoApps = ssoApps.filter((app) =>
		existsSync(getComposePath(app, baseDir)),
	);

	// Get all existing OAuth clients
	const existingClients = await db.select().from(oauthClient);
	const existingClientIds = new Set(existingClients.map((c) => c.clientId));

	// Register missing clients
	for (const app of installedSsoApps) {
		const oauth = (app as any).oauth;
		if (!oauth || existingClientIds.has(oauth.clientId)) continue;

		const clientSecret = crypto.randomUUID() + crypto.randomUUID();
		const domain = envConfig.DUCKDNS_SUBDOMAINS?.split(",")[0]?.trim();
		const redirectUris = domain ? oauth.redirectUris(domain) : [];

		await db.insert(oauthClient).values({
			id: crypto.randomUUID(),
			clientId: oauth.clientId,
			clientSecret,
			name: oauth.displayName,
			redirectUris: JSON.stringify(redirectUris),
			skipConsent: true,
			requirePKCE: true,
			grantTypes: JSON.stringify([
				"authorization_code",
				"refresh_token",
			]),
			responseTypes: JSON.stringify(["code"]),
			scopes: JSON.stringify(["openid", "profile", "email"]),
		});
	}

	// Remove stale clients (apps that are no longer installed)
	const installedClientIds = new Set(
		installedSsoApps
			.map((app) => (app as any).oauth?.clientId)
			.filter(Boolean),
	);

	for (const client of existingClients) {
		// Only remove clients that match known SSO app IDs (don't touch manually created ones)
		const knownSsoClientIds = new Set(
			ssoApps.map((app) => (app as any).oauth?.clientId).filter(Boolean),
		);
		if (
			knownSsoClientIds.has(client.clientId) &&
			!installedClientIds.has(client.clientId)
		) {
			await db
				.delete(oauthClient)
				.where(eq(oauthClient.id, client.id));
		}
	}
}
