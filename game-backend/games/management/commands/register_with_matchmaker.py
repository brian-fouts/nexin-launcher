"""
Register this game server with the backend matchmaker.
Uses MATCHMAKING_APP_ID and MATCHMAKING_SECRET to obtain an app JWT, then
POSTs to the backend /app/server/ endpoint with SERVER_NAME, SERVER_DESCRIPTION,
and SERVER_GAME_MODES. The matchmaker assigns a UUID server_id; this command
writes it to MATCHMAKER_SERVER_ID_FILE so the running app uses it automatically.
Exits with non-zero status on failure.
"""
import json
import sys
from pathlib import Path

import urllib.error
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Authenticate with backend as the matchmaking app and register this server."

    def handle(self, *args, **options):
        app_id = getattr(settings, "MATCHMAKING_APP_ID", "") or ""
        app_secret = getattr(settings, "MATCHMAKING_SECRET", "") or ""
        backend_url = getattr(settings, "BACKEND_URL", "").rstrip("/")
        server_name = getattr(settings, "SERVER_NAME", "Game Server")
        server_description = getattr(settings, "SERVER_DESCRIPTION", "")
        modes_json = getattr(settings, "SERVER_GAME_MODES_JSON", "{}")
        server_port_raw = getattr(settings, "SERVER_PORT", "8001")
        game_frontend_url = getattr(settings, "GAME_FRONTEND_URL", "") or ""

        if not app_id or not app_secret:
            self.stderr.write(
                self.style.ERROR("MATCHMAKING_APP_ID and MATCHMAKING_SECRET must be set.")
            )
            sys.exit(1)

        try:
            game_modes = json.loads(modes_json)
        except (TypeError, ValueError) as e:
            self.stderr.write(
                self.style.ERROR(f"SERVER_GAME_MODES must be valid JSON: {e}")
            )
            sys.exit(1)

        try:
            server_port = int(server_port_raw)
        except (TypeError, ValueError):
            self.stderr.write(
                self.style.ERROR("SERVER_PORT must be a valid integer.")
            )
            sys.exit(1)

        # 1) Get app JWT
        token_url = f"{backend_url}/api/v1/auth/app-token/"
        token_body = json.dumps({
            "app_id": app_id,
            "app_secret": app_secret,
        }).encode("utf-8")
        token_req = urllib.request.Request(
            token_url,
            data=token_body,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(token_req, timeout=15) as resp:
                token_data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                detail = json.loads(body).get("detail", body)
            except (ValueError, TypeError):
                detail = body
            self.stderr.write(
                self.style.ERROR(f"App token failed ({e.code}): {detail}")
            )
            sys.exit(1)
        except (urllib.error.URLError, OSError, TimeoutError, ValueError) as e:
            self.stderr.write(self.style.ERROR(f"App token request failed: {e}"))
            sys.exit(1)

        access = token_data.get("access")
        if not access:
            self.stderr.write(self.style.ERROR("No access token in response."))
            sys.exit(1)

        # 2) Create server via /app/server/
        server_url = f"{backend_url}/api/v1/app/server/"
        payload = {
            "server_name": server_name,
            "server_description": server_description,
            "game_modes": game_modes,
            "port": server_port,
        }
        if game_frontend_url:
            payload["game_frontend_url"] = game_frontend_url
        server_body = json.dumps(payload).encode("utf-8")
        server_req = urllib.request.Request(
            server_url,
            data=server_body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access}",
            },
        )
        try:
            with urllib.request.urlopen(server_req, timeout=15) as resp:
                server_data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                detail = json.loads(body).get("detail", body)
            except (ValueError, TypeError):
                detail = body
            self.stderr.write(
                self.style.ERROR(f"Server registration failed ({e.code}): {detail}")
            )
            sys.exit(1)
        except (urllib.error.URLError, OSError, TimeoutError, ValueError) as e:
            self.stderr.write(self.style.ERROR(f"Server registration request failed: {e}"))
            sys.exit(1)

        server_id = server_data.get("server_id")
        if not server_id:
            self.stdout.write(self.style.WARNING("No server_id in response; online-user polling will not work."))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Registered server with matchmaker: server_id={server_id}"
            )
        )

        # Persist server_id so the running app uses it for activity and online-user polling.
        id_file = getattr(settings, "MATCHMAKER_SERVER_ID_FILE", None) or str(
            Path(settings.BASE_DIR) / "data" / "matchmaker_server_id.txt"
        )
        path = Path(id_file)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(server_id)
            self.stdout.write(
                self.style.SUCCESS(f"Wrote server_id to {path}; app will use it automatically.")
            )
        except OSError as e:
            self.stdout.write(
                self.style.WARNING(
                    f"Could not write server_id to {path}: {e}. Set MATCHMAKER_SERVER_ID={server_id} in your environment."
                )
            )
