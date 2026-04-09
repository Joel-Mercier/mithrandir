import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import {
	oauthAccessToken,
	oauthClient,
	oauthConsent,
	oauthRefreshToken,
} from "#/db/schema";
import db from "#/lib/db";

function isLocalhost(request: Request): boolean {
	const url = new URL(request.url);
	const host = url.hostname;
	return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export const Route = createFileRoute("/api/sso/clients/$clientId")({
	server: {
		handlers: {
			/**
			 * DELETE /api/sso/clients/:clientId — Remove an OAuth client and its tokens
			 */
			DELETE: async ({
				request,
				params,
			}: { request: Request; params: { clientId: string } }) => {
				if (!isLocalhost(request)) {
					return Response.json({ error: "Forbidden" }, { status: 403 });
				}

				const { clientId } = params;

				// Find the client by clientId field
				const existing = await db
					.select()
					.from(oauthClient)
					.where(eq(oauthClient.clientId, clientId))
					.limit(1);

				if (existing.length === 0) {
					return Response.json(
						{ error: "Client not found" },
						{ status: 404 },
					);
				}

				const dbId = existing[0].id;

				// Clean up related tokens and consents
				await db
					.delete(oauthAccessToken)
					.where(eq(oauthAccessToken.clientId, dbId));
				await db
					.delete(oauthRefreshToken)
					.where(eq(oauthRefreshToken.clientId, dbId));
				await db
					.delete(oauthConsent)
					.where(eq(oauthConsent.clientId, dbId));
				await db.delete(oauthClient).where(eq(oauthClient.id, dbId));

				return Response.json({ deleted: true });
			},
		},
	},
});
