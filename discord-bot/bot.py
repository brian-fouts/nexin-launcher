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

# Gateway intents: what events the bot receives.
intents = discord.Intents.default()
intents.message_content = True  # Read message content (privileged; enable in Developer Portal)

# Permissions to request when inviting the bot (OAuth2 URL).
# Invite URL: https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions={value}&scope=bot%20applications.commands
BOT_INVITE_PERMISSIONS = discord.Permissions(
    send_messages=True,
    create_public_threads=True,
    create_private_threads=True,
    mention_everyone=True,
    add_reactions=True,
    use_application_commands=True,  # Slash commands
    create_events=True,
    manage_events=True,
    send_polls=True,  # Create polls
)


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
        invite_url = (
            f"https://discord.com/oauth2/authorize?client_id={self.application_id}"
            f"&permissions={BOT_INVITE_PERMISSIONS.value}&scope=bot%20applications.commands"
        )
        log.info("Invite URL: %s", invite_url)


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
        name="sync",
        description="Manually sync application commands with Discord",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def sync_commands(interaction: discord.Interaction):
        """Manually trigger app command sync, primarily for admins."""
        await interaction.response.defer(ephemeral=True, thinking=True)
        try:
            if interaction.guild:
                synced = await client.tree.sync(guild=interaction.guild)
                scope = f"guild {interaction.guild.id}"
            else:
                synced = await client.tree.sync()
                scope = "global"
            await interaction.followup.send(
                f"Synced {len(synced)} command(s) for {scope}.",
                ephemeral=True,
            )
        except discord.DiscordException as e:
            log.exception("Manual command sync failed")
            await interaction.followup.send(
                f"Command sync failed: {e}",
                ephemeral=True,
            )

    @client.tree.command(
        name="lfg",
        description="Create a looking-for-group session",
    )
    @app_commands.describe(
        duration="Duration in hours",
        start_time="Required. Start time in ISO 8601 UTC, e.g. 2026-03-02T20:30:00Z",
        max_party_size="Maximum party size (optional)",
        description="What the session is about",
    )
    async def lfg(
        interaction: discord.Interaction,
        duration: float,
        start_time: str,
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
            "start_time": start_time,
        }
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

    @client.tree.command(
        name="lfg_myrsps",
        description="View and manage your LFG RSVPs",
    )
    async def lfg_myrsps(
        interaction: discord.Interaction,
        group_id: str | None = None,
    ):
        backend_url = (os.environ.get("MATCHMAKER_BACKEND_URL") or "").strip().rstrip("/")
        bot_token = (os.environ.get("DISCORD_BOT_TOKEN") or "").strip()
        if not backend_url or not bot_token:
            await interaction.response.send_message(
                "LFG is not configured (MATCHMAKER_BACKEND_URL / DISCORD_BOT_TOKEN).",
                ephemeral=True,
            )
            return

        discord_id = str(interaction.user.id)

        # If a group_id is provided, attempt to remove the user's RSVP first.
        if group_id:
            await interaction.response.defer(ephemeral=True)

            leave_url = f"{backend_url}/api/v1/discord/lfg/{group_id}/leave/"

            def do_leave():
                return requests.post(
                    leave_url,
                    json={"discord_id": discord_id},
                    headers={"X-Discord-Bot-Token": bot_token, "Content-Type": "application/json"},
                    timeout=10,
                )

            try:
                leave_resp = await asyncio.to_thread(do_leave)
            except requests.RequestException as e:
                log.exception("LFG leave backend request failed")
                await interaction.followup.send(
                    f"Could not reach the matchmaker: {e!s}",
                    ephemeral=True,
                )
                return

            if leave_resp.status_code == 401:
                await interaction.followup.send(
                    "Bot token was rejected by the matchmaker.",
                    ephemeral=True,
                )
                return
            if leave_resp.status_code == 400:
                try:
                    detail = leave_resp.json().get("detail", leave_resp.text)
                except Exception:
                    detail = leave_resp.text or "Invalid request"
                await interaction.followup.send(detail, ephemeral=True)
                return
            if leave_resp.status_code not in (200, 204):
                await interaction.followup.send(
                    f"Matchmaker returned an error when removing RSVP (HTTP {leave_resp.status_code}).",
                    ephemeral=True,
                )
                return

            # If we successfully removed, fall through to listing RSVPs.

        if not interaction.response.is_done():
            await interaction.response.defer(ephemeral=True)

        list_url = f"{backend_url}/api/v1/discord/lfg/my-rsvps-by-discord/"
        payload = {"discord_id": discord_id}

        def do_post():
            return requests.post(
                list_url,
                json=payload,
                headers={"X-Discord-Bot-Token": bot_token, "Content-Type": "application/json"},
                timeout=10,
            )

        try:
            resp = await asyncio.to_thread(do_post)
        except requests.RequestException as e:
            log.exception("LFG my-rsvps backend request failed")
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
        if resp.status_code != 200:
            await interaction.followup.send(
                f"Matchmaker returned an error (HTTP {resp.status_code}).",
                ephemeral=True,
            )
            return

        try:
            items = resp.json()
        except Exception:
            await interaction.followup.send("Invalid response from matchmaker.", ephemeral=True)
            return

        if not items:
            await interaction.followup.send(
                "You do not have any active LFG RSVPs.",
                ephemeral=True,
            )
            return

        lines: list[str] = []
        for item in items:
            lfg = item.get("lfg") or {}
            lfg_id = lfg.get("id", "")
            start_iso = lfg.get("start_time", "")
            duration = lfg.get("duration", "?")
            created_by = lfg.get("created_by_username") or lfg.get("created_by", "")

            # Discord relative time: <t:unix:f> when possible
            try:
                ts = int(datetime.fromisoformat(start_iso.replace("Z", "+00:00")).timestamp())
                time_part = f"<t:{ts}:f>"
            except Exception:
                time_part = start_iso or "soon"

            line = f"- `{lfg_id}` by {created_by or 'unknown'}, {duration} hr(s), starts {time_part}"
            lines.append(line)

        content = (
            "Your current LFG RSVPs:\n"
            + "\n".join(lines)
            + "\n\nTo remove your RSVP from a group you did not create, run:\n"
            + "`/lfg_myrsps group_id:<id>`"
        )
        await interaction.followup.send(content, ephemeral=True)

    client.run(token)


if __name__ == "__main__":
    main()
