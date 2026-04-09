import { i18n } from "@better-auth/i18n";
import { oauthProvider } from "@better-auth/oauth-provider";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
	genericOAuth,
	haveIBeenPwned,
	jwt,
	twoFactor,
} from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from "#/db/schema";
import db from "#/lib/db";

// Build trusted origins from BETTER_AUTH_URL + any configured HTTPS domain
const trustedOrigins: string[] = [];
if (process.env.BETTER_AUTH_URL) {
	trustedOrigins.push(process.env.BETTER_AUTH_URL);
}
if (process.env.DUCKDNS_SUBDOMAINS) {
	const domain = process.env.DUCKDNS_SUBDOMAINS.split(",")[0]?.trim();
	if (domain) trustedOrigins.push(`https://mithrandir.${domain}.duckdns.org`);
}

// OIDC client configuration (optional — enabled when all 3 env vars are set)
const oidcEnabled =
	process.env.OIDC_CLIENT_ID &&
	process.env.OIDC_CLIENT_SECRET &&
	process.env.OIDC_ISSUER_URL;

// SSO provider configuration (optional — makes this UI an OAuth/OIDC provider for homelab apps)
const ssoEnabled = process.env.ENABLE_SSO === "true";

export const auth = betterAuth({
	appName: "Mithrandir",
	trustedOrigins,
	// Trust reverse proxies (Caddy, Docker network) for IP forwarding
	trustedProxies: [
		"127.0.0.1",
		"::1",
		"172.16.0.0/12",
		"10.0.0.0/8",
		"192.168.0.0/16",
	],
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	user: {
		changeEmail: {
			enabled: true,
			updateEmailWithoutVerification: true,
		},
	},
	plugins: [
		tanstackStartCookies(),
		twoFactor({ issuer: "Mithrandir" }),
		haveIBeenPwned(),
		i18n({
			translations: {
				fr: {
					USER_NOT_FOUND: "Utilisateur non trouvé",
					INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe invalide",
					INVALID_PASSWORD: "Mot de passe invalide",
				},
			},
		}),
		...(oidcEnabled
			? [
					genericOAuth({
						config: [
							{
								providerId: "oidc",
								clientId: process.env.OIDC_CLIENT_ID!,
								clientSecret: process.env.OIDC_CLIENT_SECRET!,
								discoveryUrl: `${process.env.OIDC_ISSUER_URL!}/.well-known/openid-configuration`,
								scopes: ["openid", "profile", "email"],
								pkce: true,
							},
						],
					}),
				]
			: []),
		...(ssoEnabled
			? [
					jwt(),
					oauthProvider({
						loginPage: "/sign-in",
						consentPage: "/consent",
					}),
				]
			: []),
	],
});

export const getOidcEnabled = createServerFn({ method: "GET" }).handler(
	async () => {
		return !!oidcEnabled;
	},
);


export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		return session;
	},
);
export const ensureSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}
		return session;
	},
);
