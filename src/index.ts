import {
	ActionRowBuilder,
	ApplicationCommand,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	GuildMember,
	MessageFlags,
	REST,
	Routes,
} from "discord.js";
import { Subscriptions } from "./subscriptions";

const commands = [
	{
		name: "subscribe",
		description: "Subscribe to a keyword/phrase.",
		options: [
			{
				name: "to",
				description: "keyword/phrase",
				type: ApplicationCommandOptionType.String,
				required: true,
				minLength: 3,
				maxLength: 30,
			},
			{
				name: "in",
				description: "channel",
				type: ApplicationCommandOptionType.Channel,
				required: false,
				channelTypes: [ChannelType.GuildText, ChannelType.GuildCategory],
			},
		],
		dmPermission: false,
	},
	{
		name: "unsubscribe",
		description: "Unsubscribe from a keyword/phrase.",
		options: [
			{
				name: "from",
				description: "keyword/phrase",
				type: ApplicationCommandOptionType.String,
				required: false,
				minLength: 3,
				maxLength: 30,
				autocomplete: true,
			},
		],
	},
] as ApplicationCommand[];

if (!Bun.env.DISCORD_TOKEN || !Bun.env.DISCORD_CLIENT_ID) {
	throw new Error("DISCORD_TOKEN & DISCORD_CLIENT_ID env must be present.");
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildPresences,
	],
});
const rest = new REST().setToken(Bun.env.DISCORD_TOKEN);

const subscriptions = new Subscriptions({
	maxCachedAccounts: 1000,
	maxPerAccount: 30,
});

if (Bun.env.REGISTER_COMMANDS) {
	await rest.put(Routes.applicationCommands(Bun.env.DISCORD_CLIENT_ID), {
		body: commands,
	});
}

client.on(Events.ClientReady, () => console.log(`Logged in as ${client.user!.tag}!`));

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isAutocomplete() && interaction.commandName == "unsubscribe") {
		await interaction.respond(
			subscriptions
				.for(interaction.user.id)
				.slice(0, 25)
				.map((subscription) => {
					return {
						name: subscription.to,
						value: subscription.to,
					};
				})
		);
		return;
	}

	if (interaction.isButton() && interaction.customId.startsWith("unsubscribe:")) {
		const from = interaction.customId.slice(12);
		subscriptions.unsubscribe(interaction.user.id, from);
		await client.channels.fetch(interaction.channelId);
		await interaction.message.edit({ components: [] });
		return;
	}

	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === "subscribe") {
		const to = interaction.options.getString("to", true);
		const channel = interaction.options.getChannel("in", false);

		if (to.length > 30 || to.length < 3) {
			await interaction.reply({
				content: `❌ Input must be within 3 and 30 characters in length.`,
				ephemeral: true,
			});
			return;
		}

		try {
			subscriptions.subscribe(interaction.user.id, to);
			await interaction.reply({
				content: `✅ Subscribed to \`${to}\`${channel ? ` in https://discord.com/channels/${interaction.guildId}/${channel.id}` : ""}!`,
				flags: MessageFlags.SuppressEmbeds,
				ephemeral: true,
			});
		} catch (e) {
			await interaction.reply({
				content: `❌ Could not subscribe to \`${to}\`, you are already subscribed or reached the maximum number of subscriptions.`,
				ephemeral: true,
			});
		}
	} else if (interaction.commandName === "unsubscribe") {
		const from = interaction.options.getString("from", false);

		try {
			subscriptions.unsubscribe(interaction.user.id, from || undefined);

			await interaction.reply({
				content: `✅ Unsubscribed from \`${from || "all"}\`!`,
				ephemeral: true,
			});
		} catch (e) {
			await interaction.reply({
				content: `❌ Could not unsubscribe from \`${from || "all"}\`, you are not subscribed or something went wrong.`,
				ephemeral: true,
			});
		}
	}
});

client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot || message.thread) return;

	const channel = await message.guild?.channels.fetch(message.channel.id, { cache: true });

	if (!channel) return;

	const members = channel.members as Collection<string, GuildMember>;

	for (let [snowflake, member] of members) {
		if (member.user.bot || snowflake == message.author.id) continue;
		// TODO: only iterate over the same keyword once per message
		for (let subscription of subscriptions.for(snowflake)) {
			if (subscription.in && message.channel.id != subscription.in && channel.parent?.id != subscription.in) continue;

			if (message.cleanContent.indexOf(subscription.to) > -1) {
				if (!member.dmChannel) await member.createDM();

				const unsubscribeAction = new ButtonBuilder()
					.setCustomId(`unsubscribe:${subscription.to}`)
					.setLabel("Unsubscribe")
					.setStyle(ButtonStyle.Secondary);
				const row = new ActionRowBuilder().addComponents(unsubscribeAction);

				await member.dmChannel?.send({
					embeds: [
						{
							author: {
								name: message.author.displayName,
								url: `https://discord.com/users/${message.author.id}`,
								icon_url: message.author.avatarURL() || undefined,
							},
							description: message.content + `\n\n${message.url}`,
						},
					],
					// @ts-ignore
					components: [row],
				});
				break;
			}
		}
	}
});

client.login(Bun.env.DISCORD_TOKEN);
