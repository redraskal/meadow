import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import Database from "bun:sqlite";

export const sqlite = new Database(Bun.env.DATABASE || "meadow.sqlite");
export const database = drizzle(sqlite);

if (Bun.env.DATABASE_MIGRATE) {
	migrate(database, { migrationsFolder: "./drizzle" });
}
