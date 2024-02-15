import { and, eq, sql } from "drizzle-orm";
import { database } from "./database";
import { SubscriptionsTable } from "./schema/subscriptions";
import type { TextChannel } from "discord.js";

type Subscription = {
	to: string;
	in: string | null;
};

const selectSubscriptions = database
	.select({
		to: SubscriptionsTable.to,
		in: SubscriptionsTable.in,
	})
	.from(SubscriptionsTable)
	.where(eq(SubscriptionsTable.discord_id, sql.placeholder("discord_id")))
	.prepare();

const insertSubscription = database
	.insert(SubscriptionsTable)
	.values({
		discord_id: sql.placeholder("discord_id"),
		to: sql.placeholder("to"),
		in: sql.placeholder("in"),
	})
	.prepare();

const countSubscriptions = database
	.select({
		total: sql<number>`count()`,
	})
	.from(SubscriptionsTable)
	.where(eq(SubscriptionsTable.discord_id, sql.placeholder("discord_id")))
	.prepare();

const deleteSubscription = database
	.delete(SubscriptionsTable)
	.where(
		and(
			eq(SubscriptionsTable.discord_id, sql.placeholder("discord_id")),
			eq(SubscriptionsTable.to, sql.placeholder("from"))
		)
	)
	.prepare();
const deleteSubscriptions = database
	.delete(SubscriptionsTable)
	.where(eq(SubscriptionsTable.discord_id, sql.placeholder("discord_id")))
	.prepare();

export class Subscriptions {
	readonly maxCachedAccounts: number;
	readonly maxPerAccount: number;

	#accounts: Array<String> = [];
	#cache: Map<String, Array<Subscription>> = new Map();

	constructor(params: { maxCachedAccounts: number; maxPerAccount: number }) {
		if (params.maxCachedAccounts < 2) throw new Error("Max cached accounts must be greater than 1.");
		if (params.maxPerAccount < 1) throw new Error("Max subscriptions per account must be greater than 0.");

		this.maxCachedAccounts = params.maxCachedAccounts;
		this.maxPerAccount = params.maxPerAccount;
	}

	for(discord_id: string) {
		if (!(discord_id in this.#accounts)) {
			const subscriptions = selectSubscriptions.all({
				discord_id,
			});

			this.#cache.set(discord_id, subscriptions);
			this.#accounts.push(discord_id);

			if (this.#accounts.length >= this.maxCachedAccounts) {
				this.#cache.delete(this.#accounts.shift()!);
			}

			return subscriptions;
		}

		return this.#cache.get(discord_id) || [];
	}

	subscribe(discord_id: string, to: string, channel?: TextChannel) {
		if ((countSubscriptions.get({ discord_id })?.total || 0) >= this.maxPerAccount) {
			throw new Error(`Account cannot exceed ${this.maxPerAccount} subscriptions.`);
		}

		insertSubscription.run({
			discord_id,
			to,
			in: channel?.id,
		});

		this.#cache.get(discord_id)?.push({
			to,
			in: channel ? channel.id : null,
		});
	}

	unsubscribe(discord_id: string, from?: string) {
		if (from) {
			deleteSubscription.run({
				discord_id,
				from,
			});
			const subscriptions = this.#cache.get(discord_id);
			if (subscriptions)
				this.#cache.set(
					discord_id,
					subscriptions.filter((subscription) => subscription.to != from)
				);
		} else {
			deleteSubscriptions.run({
				discord_id,
			});
			this.#cache.delete(discord_id);
			this.#accounts = this.#accounts.filter((account) => account != discord_id);
		}
	}
}
