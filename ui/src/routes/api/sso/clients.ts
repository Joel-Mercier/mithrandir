import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { oauthClient } from "#/db/schema";
import db from "#/lib/db";

/**
 * Localhost-only API for CLI to manage OAuth clients.
 * These endpoints bypass Better-Auth's session requirement since
 * they're restricted to local access only.
 */

function isLocalhost(request: Request): boolean {
	const url = new URL(request.url);
	const host = url.hostname;
	return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export const Route = createFileRoute("/api/sso/clients")({
	server: {
		handlers: {
			/**
			 * GET /api/sso/clients — List all registered OAuth clients
			 */
			GET: async ({ request }: { request: Request }) => {
				if (!isLocalhost(request)) {
					return Response.json({ error: "Forbidden" }, { status: 403 });
				}

				const clients = await db.select().from(oauthClient);
				return Response.json(
					clients.map((c) => ({
						clientId: c.clientId,
						name: c.name,
						redirectUris: c.redirectUris,
						skipConsent: c.skipConsent,
						disabled: c.disabled,
						createdAt: c.createdAt,
					})),
				);
			},

			/**
			 * POST /api/sso/clients — Register a new OAuth client
			 * Body: { clientId, clientName, redirectUris, icon? }
			 * Returns: { clientId, clientSecret }
			 */
			POST: async ({ request }: { request: Request }) => {
				if (!isLocalhost(request)) {
					return Response.json({ error: "Forbidden" }, { status: 403 });
				}

				const body = (await request.json()) as {
					clientId: string;
					clientName: string;
					redirectUris: string[];
					icon?: string;
				};

				if (!body.clientId || !body.redirectUris?.length) {
					return Response.json(
						{ error: "clientId and redirectUris are required" },
						{ status: 400 },
					);
				}

				// Check if client already exists
				const existing = await db
					.select()
					.from(oauthClient)
					.where(eq(oauthClient.clientId, body.clientId))
					.limit(1);

				if (existing.length > 0) {
					// Update existing client
					await db
						.update(oauthClient)
						.set({
							name: body.clientName,
							redirectUris: JSON.stringify(body.redirectUris),
							icon: body.icon,
							disabled: false,
						})
						.where(eq(oauthClient.clientId, body.clientId));

					return Response.json({
						clientId: existing[0].clientId,
						clientSecret: existing[0].clientSecret,
						updated: true,
					});
				}

				// Generate client secret
				const clientSecret = crypto.randomUUID() + crypto.randomUUID();
				const id = crypto.randomUUID();

				await db.insert(oauthClient).values({
					id,
					clientId: body.clientId,
					clientSecret,
					name: body.clientName,
					redirectUris: JSON.stringify(body.redirectUris),
					icon: body.icon,
					skipConsent: true,
					requirePKCE: true,
					grantTypes: JSON.stringify([
						"authorization_code",
						"refresh_token",
					]),
					responseTypes: JSON.stringify(["code"]),
					scopes: JSON.stringify(["openid", "profile", "email"]),
				});

				return Response.json({
					clientId: body.clientId,
					clientSecret,
					updated: false,
				});
			},
		},
	},
});
