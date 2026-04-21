import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync } from "node:fs";
import { join } from "node:path";
import * as schema from "#/db/schema";
import { getProjectRoot } from "#/lib/server/utils";

const db = drizzle(process.env.DB_FILE_NAME!, { schema });

// Apply any pending migrations on startup. Idempotent — drizzle tracks applied
// migrations in the __drizzle_migrations table. Fresh installs get the full
// schema; existing DBs pick up new migrations after a self-update restart.
try {
	const migrationsFolder = join(getProjectRoot(), "ui", "drizzle");
	if (existsSync(migrationsFolder)) {
		await migrate(db, { migrationsFolder });
	}
} catch (err) {
	console.error("[db] Migration failed on startup:", err);
}

export default db;
