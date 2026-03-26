import { createServerFn } from "@tanstack/react-start";
import { desc, sql } from "drizzle-orm";
import { activityHistory } from "#/db/schema";
import { ensureSession } from "#/lib/auth";
import db from "#/lib/db";

const MAX_ITEMS = 100;

export type ActivityItem = {
	id: string;
	action: string;
	targetType: string;
	targetName: string | null;
	route: string;
	createdAt: Date;
};

export const fetchActivity = createServerFn({ method: "GET" }).handler(
	async (): Promise<ActivityItem[]> => {
		await ensureSession();
		const rows = await db
			.select()
			.from(activityHistory)
			.orderBy(desc(activityHistory.createdAt))
			.limit(MAX_ITEMS);
		return rows.map((r) => ({
			...r,
			createdAt: r.createdAt,
		}));
	},
);

export async function logActivity(
	action: string,
	targetType: string,
	targetName: string | null,
	route: string,
) {
	await db.insert(activityHistory).values({
		id: crypto.randomUUID(),
		action,
		targetType,
		targetName,
		route,
	});

	// Trim to keep only the last MAX_ITEMS rows
	await db.run(sql`
		DELETE FROM activity_history
		WHERE id NOT IN (
			SELECT id FROM activity_history
			ORDER BY created_at DESC
			LIMIT ${MAX_ITEMS}
		)
	`);
}
