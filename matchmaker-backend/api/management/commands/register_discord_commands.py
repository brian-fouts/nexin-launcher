"""
Register the /lfg slash command with Discord (global application command).
Run once after setting DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID, or when command options change.
"""
import requests

from django.conf import settings
from django.core.management.base import BaseCommand


DISCORD_API = "https://discord.com/api/v10"


class Command(BaseCommand):
    help = "Register the /lfg slash command with Discord."

    def handle(self, *args, **options):
        token = getattr(settings, "DISCORD_BOT_TOKEN", "").strip()
        app_id = getattr(settings, "DISCORD_CLIENT_ID", "").strip()
        if not token or not app_id:
            self.stderr.write(
                "Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID (application id) in the environment."
            )
            return 1

        url = f"{DISCORD_API}/applications/{app_id}/commands"
        payload = {
            "name": "lfg",
            "description": "Create a looking-for-group session",
            "options": [
                {
                    "name": "duration",
                    "description": "Duration in hours",
                    "type": 10,  # NUMBER
                    "required": True,
                },
                {
                    "name": "start_time",
                    "description": "Required. Start time in ISO 8601 UTC, e.g. 2026-03-02T20:30:00Z",
                    "type": 3,  # STRING
                    "required": True,
                },
                {
                    "name": "max_party_size",
                    "description": "Maximum party size (optional)",
                    "type": 4,  # INTEGER
                    "required": False,
                },
                {
                    "name": "description",
                    "description": "What the session is about",
                    "type": 3,  # STRING
                    "required": False,
                },
            ],
        }
        resp = requests.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bot {token}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        if not resp.ok:
            self.stderr.write(f"Discord API error: {resp.status_code} {resp.text}")
            return 1
        self.stdout.write("Registered /lfg command successfully.")
        return 0
