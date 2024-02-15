CREATE TABLE `subscriptions` (
	`discord_id` text NOT NULL,
	`to` text NOT NULL,
	`in` text,
	PRIMARY KEY(`discord_id`, `to`)
);
--> statement-breakpoint
CREATE INDEX `discord_id_idx` ON `subscriptions` (`discord_id`);