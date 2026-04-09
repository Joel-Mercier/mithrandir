import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.default(false)
		.notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).default(
		false,
	),
});

export const session = sqliteTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: integer("access_token_expires_at", {
			mode: "timestamp_ms",
		}),
		refreshTokenExpiresAt: integer("refresh_token_expires_at", {
			mode: "timestamp_ms",
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const passkey = sqliteTable(
	"passkey",
	{
		id: text("id").primaryKey(),
		name: text("name"),
		publicKey: text("public_key").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		credentialID: text("credential_id").notNull().unique(),
		counter: integer("counter").notNull(),
		deviceType: text("device_type").notNull(),
		backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
		transports: text("transports"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("passkey_userId_idx").on(table.userId)],
);

export const twoFactor = sqliteTable(
	"two_factor",
	{
		id: text("id").primaryKey(),
		secret: text("secret").notNull(),
		backupCodes: text("backup_codes").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("twoFactor_secret_idx").on(table.secret),
		index("twoFactor_userId_idx").on(table.userId),
	],
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	twoFactors: many(twoFactor),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id],
	}),
}));

// OAuth Provider tables (used when ENABLE_SSO=true)
export const oauthClient = sqliteTable(
	"oauth_client",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id").notNull().unique(),
		clientSecret: text("client_secret"),
		disabled: integer("disabled", { mode: "boolean" }).default(false),
		skipConsent: integer("skip_consent", { mode: "boolean" }),
		enableEndSession: integer("enable_end_session", { mode: "boolean" }),
		subjectType: text("subject_type"),
		scopes: text("scopes"),
		userId: text("user_id").references(() => user.id),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		name: text("name"),
		uri: text("uri"),
		icon: text("icon"),
		contacts: text("contacts"),
		tos: text("tos"),
		policy: text("policy"),
		softwareId: text("software_id"),
		softwareVersion: text("software_version"),
		softwareStatement: text("software_statement"),
		redirectUris: text("redirect_uris").notNull(),
		postLogoutRedirectUris: text("post_logout_redirect_uris"),
		tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
		grantTypes: text("grant_types"),
		responseTypes: text("response_types"),
		public: integer("public", { mode: "boolean" }),
		type: text("type"),
		requirePKCE: integer("require_pkce", { mode: "boolean" }),
		referenceId: text("reference_id"),
		metadata: text("metadata"),
	},
	(table) => [index("oauthClient_clientId_idx").on(table.clientId)],
);

export const oauthAccessToken = sqliteTable(
	"oauth_access_token",
	{
		id: text("id").primaryKey(),
		token: text("token").notNull().unique(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.id),
		sessionId: text("session_id").references(() => session.id, {
			onDelete: "set null",
		}),
		userId: text("user_id").references(() => user.id),
		referenceId: text("reference_id"),
		refreshId: text("refresh_id"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		scopes: text("scopes").notNull(),
	},
	(table) => [index("oauthAccessToken_token_idx").on(table.token)],
);

export const oauthRefreshToken = sqliteTable(
	"oauth_refresh_token",
	{
		id: text("id").primaryKey(),
		token: text("token").notNull(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.id),
		sessionId: text("session_id").references(() => session.id, {
			onDelete: "set null",
		}),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		referenceId: text("reference_id"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		revoked: integer("revoked", { mode: "timestamp_ms" }),
		authTime: integer("auth_time", { mode: "timestamp_ms" }),
		scopes: text("scopes").notNull(),
	},
	(table) => [index("oauthRefreshToken_token_idx").on(table.token)],
);

export const oauthConsent = sqliteTable(
	"oauth_consent",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.id),
		userId: text("user_id").references(() => user.id),
		referenceId: text("reference_id"),
		scopes: text("scopes").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("oauthConsent_clientId_idx").on(table.clientId)],
);

export const systemSettings = sqliteTable("system_settings", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
});

export const activityHistory = sqliteTable(
	"activity_history",
	{
		id: text("id").primaryKey(),
		action: text("action").notNull(),
		targetType: text("target_type").notNull(),
		targetName: text("target_name"),
		route: text("route").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("activityHistory_createdAt_idx").on(table.createdAt)],
);
