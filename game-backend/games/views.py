import json
import urllib.error
import urllib.request

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    """Health check endpoint for the game-backend service."""
    return Response({"status": "ok", "service": "game-backend"})


@api_view(["POST"])
def login(request):
    """
    Validate a one-time ticket by calling the backend's one-time-token/validate endpoint.
    POST body: {"ticket": "<token>"}. On success returns user_id, username, app_id; on failure returns 401.
    """
    ticket = request.data.get("ticket") if request.data else None
    if not ticket:
        return Response(
            {"detail": "Missing ticket."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    url = f"{settings.BACKEND_URL}/api/v1/one-time-token/validate/"
    data = json.dumps({"token": ticket}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return Response(json.loads(body), status=resp.status)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            detail = json.loads(body).get("detail", "Authentication failed.")
        except (ValueError, TypeError):
            detail = "Authentication failed."
        return Response(
            {"detail": detail},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except (urllib.error.URLError, OSError, TimeoutError, ValueError):
        return Response(
            {"detail": "Authentication service error."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
