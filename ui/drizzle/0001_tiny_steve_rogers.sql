CREATE TABLE `activity_history` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_name` text,
	`title` text NOT NULL,
	`route` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activityHistory_createdAt_idx` ON `activity_history` (`created_at`);