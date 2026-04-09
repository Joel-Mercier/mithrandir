import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { reconcileSsoClients } from "./lib/server/sso.js";
import { paraglideMiddleware } from "./paraglide/server.js";

// Run SSO client reconciliation on startup (fire-and-forget)
reconcileSsoClients().catch(() => {});

export default createServerEntry({
	fetch(request) {
		return paraglideMiddleware(request, () => handler.fetch(request));
	},
});
