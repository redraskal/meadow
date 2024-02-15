import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const SubscriptionsTable = sqliteTable(
	"subscriptions",
	{
		discord_id: text("discord_id").notNull(),
		to: text("to").notNull(),
		in: text("in"),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.discord_id, table.to] }),
			discord_id_idx: index("discord_id_idx").on(table.discord_id),
		};
	}
);
