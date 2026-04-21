import { drizzle } from "drizzle-orm/libsql";
import * as schema from "#/db/schema";

const db = drizzle(process.env.DB_FILE_NAME!, { schema });

// Apply any pending migrations on startup. Idempotent — drizzle tracks applied
// migrations in the __drizzle_migrations table. Gated behind import.meta.env.SSR
// and dynamic imports so the node: builtins never reach the client bundle.
if (import.meta.env.SSR) {
	try {
		const { migrate } = await import("drizzle-orm/libsql/migrator");
		const { existsSync } = await import("node:fs");
		const { join } = await import("node:path");
		const { getProjectRoot } = await import("#/lib/server/utils");
		const migrationsFolder = join(getProjectRoot(), "ui", "drizzle");
		if (existsSync(migrationsFolder)) {
			await migrate(db, { migrationsFolder });
		}
	} catch (err) {
		console.error("[db] Migration failed on startup:", err);
	}
}

export default db;
