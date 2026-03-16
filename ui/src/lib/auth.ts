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

export const auth = betterAuth({
  appName: "Mithrandir",
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
