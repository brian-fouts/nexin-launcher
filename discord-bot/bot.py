"""
Nexin Discord bot — long-lived gateway client using discord.py.
Uses DISCORD_BOT_TOKEN and MATCHMAKER_BACKEND_URL from environment.
"""
import asyncio
import os
import logging
from datetime import datetime

import discord
from discord import app_commands
import requests

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

    client = NexinBot()

    @client.tree.command(name="ping", description="Replies with pong and latency")
    async def ping(interaction: discord.Interaction):
        latency_ms = round(client.latency * 1000)
        await interaction.response.send_message(
            f"Pong! Latency: {latency_ms} ms",
            ephemeral=True,
        )

    @client.tree.command(
        name="lfg",
        description="Create a looking-for-group session",
    )
    @app_commands.describe(
        duration="Duration in hours",
        start_time="When to start (ISO datetime, or leave empty for 5 min from now)",
        max_party_size="Maximum party size (optional)",
        description="What the session is about",
    )
    async def lfg(
        interaction: discord.Interaction,
        duration: float,
        start_time: str | None = None,
        max_party_size: int | None = None,
        description: str | None = None,
    ):
        backend_url = (os.environ.get("MATCHMAKER_BACKEND_URL") or "").strip().rstrip("/")
        bot_token = (os.environ.get("DISCORD_BOT_TOKEN") or "").strip()
        if not backend_url or not bot_token:
            await interaction.response.send_message(
                "LFG is not configured (MATCHMAKER_BACKEND_URL / DISCORD_BOT_TOKEN).",
                ephemeral=True,
            )
            return
        if duration <= 0:
            await interaction.response.send_message(
                "Duration must be greater than 0.",
                ephemeral=True,
            )
            return

        await interaction.response.defer(ephemeral=False)

        url = f"{backend_url}/api/v1/discord/lfg/create-by-discord/"
        payload = {
            "discord_id": str(interaction.user.id),
            "duration": duration,
            "description": description or "",
        }
        if start_time:
            payload["start_time"] = start_time
        if max_party_size is not None and max_party_size >= 1:
            payload["max_party_size"] = max_party_size

        def do_post():
            return requests.post(
                url,
                json=payload,
                headers={"X-Discord-Bot-Token": bot_token, "Content-Type": "application/json"},
                timeout=10,
            )

        try:
            resp = await asyncio.to_thread(do_post)
        except requests.RequestException as e:
            log.exception("LFG backend request failed")
            await interaction.followup.send(
                f"Could not reach the matchmaker: {e!s}",
                ephemeral=True,
            )
            return

        if resp.status_code == 401:
            await interaction.followup.send(
                "Bot token was rejected by the matchmaker.",
                ephemeral=True,
            )
            return
        if resp.status_code == 400:
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text or "Invalid request"
            await interaction.followup.send(detail, ephemeral=True)
            return
        if resp.status_code != 201:
            await interaction.followup.send(
                f"Matchmaker returned an error (HTTP {resp.status_code}).",
                ephemeral=True,
            )
            return

        try:
            data = resp.json()
        except Exception:
            await interaction.followup.send("Invalid response from matchmaker.", ephemeral=True)
            return

        group_id = data.get("id", "")
        start_iso = data.get("start_time", "")
        duration_hr = data.get("duration", duration)
        link = data.get("link", "")
        # Discord relative time: <t:unix:f> for full date/time
        try:
            ts = int(datetime.fromisoformat(start_iso.replace("Z", "+00:00")).timestamp())
            time_part = f"<t:{ts}:f>"
        except Exception:
            time_part = start_iso or "soon"
        content = (
            f"LFG group created. You're in! Duration: {duration_hr} hr(s), starts at {time_part}."
        )
        if link:
            content += f" View and share: {link}"
        await interaction.followup.send(content)

    client.run(token)


if __name__ == "__main__":
    main()
