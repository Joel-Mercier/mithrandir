import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from '#/lib/db';
import * as schema from '#/db/schema';
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { twoFactor } from "better-auth/plugins";
import { haveIBeenPwned } from "better-auth/plugins"
import { i18n } from "@better-auth/i18n"

// Build trusted origins from BETTER_AUTH_URL + any configured HTTPS domain
const trustedOrigins: string[] = []
if (process.env.BETTER_AUTH_URL) {
  trustedOrigins.push(process.env.BETTER_AUTH_URL)
}
if (process.env.DUCKDNS_SUBDOMAINS) {
  const domain = process.env.DUCKDNS_SUBDOMAINS.split(",")[0]?.trim()
  if (domain) trustedOrigins.push(`https://mithrandir.${domain}.duckdns.org`)
}

export const auth = betterAuth({
  appName: "Mithrandir",
  trustedOrigins,
  // Trust reverse proxies (Caddy, Docker network) for IP forwarding
  trustedProxies: ["127.0.0.1", "::1", "172.16.0.0/12", "10.0.0.0/8", "192.168.0.0/16"],
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
  ],
})

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  return session;
});
export const ensureSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
});
