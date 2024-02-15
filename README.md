# Meadow

A Discord bot for notifying users on messages containing subscribed keywords/phrases.

## Environmental variables:

| Name                              | Description                                                        | Default |
| --------------------------------- | ------------------------------------------------------------------ | ------- |
| DISCORD_TOKEN                     | Discord bot token from https://discord.com/developers/applications |         |
| DISCORD_CLIENT_ID                 | Discord client id from https://discord.com/developers/applications |         |
| SUBSCRIPTIONS_MAX_CACHED_ACCOUNTS | Maximum number of accounts cached                                  | 1000    |
| SUBSCRIPTIONS_MAX_PER_ACCOUNT     | Maximum number of subscription entries per Discord account         | 30      |
| REGISTER_COMMANDS                 | Set to register Discord application commands for the bot           |         |

To install dependencies:

```bash
bun install
```

To run:

```bash
bun src/index.ts
```

This project was created using `bun init` in bun v1.0.26. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
