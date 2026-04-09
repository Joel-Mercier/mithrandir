import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { genericOAuthClient } from "better-auth/client/plugins";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getLocale } from "#/paraglide/runtime";
export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = getLocale() === "en" ? "/two-factor" : `/${getLocale()}/two-factor`;
      },
    }),
    genericOAuthClient(),
    oauthProviderClient(),
  ],
});
