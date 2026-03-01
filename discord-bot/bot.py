"""
Nexin Discord bot — long-lived gateway client using discord.py.
Uses DISCORD_BOT_TOKEN from environment.
"""
import os
import logging

import discord
from discord import app_commands

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("nexin-bot")

intents = discord.Intents.default()
intents.message_content = True


class NexinBot(discord.Client):
    def __init__(self):
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        # Sync app commands (optional; can also use register_discord_commands in matchmaker-backend)
        try:
            synced = await self.tree.sync()
            log.info("Synced %s command(s)", len(synced))
        except discord.DiscordException as e:
            log.warning("Could not sync commands: %s", e)

    async def on_ready(self):
        log.info("Logged in as %s (id %s)", self.user, self.user.id if self.user else None)


def main():
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    if not token:
        log.error("DISCORD_BOT_TOKEN is not set")
        raise SystemExit(1)

    if os.environ.get("DOTENV_LOAD"):
        from dotenv import load_dotenv
        load_dotenv()

    client = NexinBot()

    @client.tree.command(name="ping", description="Replies with pong and latency")
    async def ping(interaction: discord.Interaction):
        latency_ms = round(client.latency * 1000)
        await interaction.response.send_message(
            f"Pong! Latency: {latency_ms} ms",
            ephemeral=True,
        )

    client.run(token)


if __name__ == "__main__":
    main()
