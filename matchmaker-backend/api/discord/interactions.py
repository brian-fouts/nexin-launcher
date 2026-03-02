"""
Discord HTTP Interactions endpoint for slash commands.
Discord POSTs here when users invoke /lfg etc.; we verify the signature and respond with JSON.
"""
import json
from datetime import datetime, timedelta

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from api.discord.lfg.service import create_lfg_group
from django.core.exceptions import ValidationError


def _verify_discord_signature(body: bytes, signature_hex: str, timestamp: str) -> bool:
    """Verify Discord interaction request using DISCORD_PUBLIC_KEY (ed25519)."""
    public_key = getattr(settings, "DISCORD_PUBLIC_KEY", "").strip()
    if not public_key or not signature_hex or not timestamp:
        return False
    try:
        key = VerifyKey(bytes.fromhex(public_key))
        message = timestamp.encode("utf-8") + body
        sig = bytes.fromhex(signature_hex)
        key.verify(message, sig)
        return True
    except (BadSignatureError, ValueError, TypeError):
        return False


def _get_option(data: list, name: str):
    """Get option value by name from Discord interaction options list."""
    if not data:
        return None
    for opt in data:
        if opt.get("name") == name:
            return opt.get("value")
    return None


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(require_POST, name="dispatch")
class DiscordInteractionsView(View):
    """
    POST /api/v1/discord/interactions/
    Body: raw JSON (Discord interaction payload).
    """

    def post(self, request):
        body = request.body
        signature = request.headers.get("X-Signature-Ed25519", "")
        timestamp = request.headers.get("X-Signature-Timestamp", "")
        if not _verify_discord_signature(body, signature, timestamp):
            return JsonResponse({"error": "Invalid signature"}, status=401)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        interaction_type = data.get("type")

        # PING (type 1): Discord sends this to verify the endpoint
        if interaction_type == 1:
            return JsonResponse({"type": 1})

        # APPLICATION_COMMAND (type 2): slash command
        if interaction_type == 2:
            return self._handle_command(data)

        return JsonResponse({"type": 1}, status=200)

    def _handle_command(self, data):
        command_data = data.get("data", {})
        command_name = command_data.get("name")
        options = command_data.get("options") or []

        if command_name == "lfg":
            return self._handle_lfg(data, options)

        return JsonResponse({
            "type": 4,
            "data": {"content": f"Unknown command: {command_name}", "flags": 64},
        })

    def _handle_lfg(self, interaction: dict, options: list):
        # Resolve invoker's Discord id (guild vs DM)
        member = interaction.get("member") or {}
        user = member.get("user") or interaction.get("user") or {}
        discord_id = str(user.get("id", ""))
        if not discord_id:
            return JsonResponse({
                "type": 4,
                "data": {"content": "Could not identify your Discord account.", "flags": 64},
            })

        # Parse options
        duration = _get_option(options, "duration")
        if duration is None:
            duration = 1.0
        try:
            duration = float(duration)
        except (TypeError, ValueError):
            duration = 1.0
        if duration <= 0:
            return JsonResponse({
                "type": 4,
                "data": {"content": "Duration must be greater than 0.", "flags": 64},
            })

        start_time_str = _get_option(options, "start_time")
        if not start_time_str:
            return JsonResponse({
                "type": 4,
                "data": {
                    "content": "start_time is required. Use ISO 8601 UTC, e.g. 2026-03-02T20:30:00Z.",
                    "flags": 64,
                },
            })
        try:
            start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
            if start_time.tzinfo is None:
                start_time = timezone.make_aware(start_time)
        except (ValueError, TypeError):
            return JsonResponse({
                "type": 4,
                "data": {
                    "content": "Invalid start_time format. Use ISO 8601 UTC, e.g. 2026-03-02T20:30:00Z.",
                    "flags": 64,
                },
            })

        max_party_size = _get_option(options, "max_party_size")
        if max_party_size is not None:
            try:
                max_party_size = int(max_party_size)
                if max_party_size < 1:
                    max_party_size = None
            except (TypeError, ValueError):
                max_party_size = None

        description = _get_option(options, "description") or ""

        try:
            group = create_lfg_group(
                discord_id=discord_id,
                start_time=start_time,
                duration=duration,
                max_party_size=max_party_size,
                description=description,
            )
        except ValidationError as e:
            msg = e.messages[0] if e.messages else str(e)
            return JsonResponse({
                "type": 4,
                "data": {"content": msg, "flags": 64},
            })

        frontend_url = getattr(settings, "MATCHMAKER_FRONTEND_URL", "").strip()
        link = f"{frontend_url.rstrip('/')}/lfg/{group.id}" if frontend_url else ""
        content = f"LFG group created. You're in! Duration: {group.duration} hr(s), starts at <t:{int(group.start_time.timestamp())}:f>."
        if link:
            content += f" View and share: {link}"

        return JsonResponse({
            "type": 4,
            "data": {"content": content},
        })
