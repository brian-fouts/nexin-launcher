import json
import urllib.error
import urllib.request

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .matchmaker_client import get_cached_online_users, report_activity


@api_view(["GET"])
def health(request):
    """Health check endpoint for the game-backend service."""
    return Response({"status": "ok", "service": "game-backend"})


@api_view(["GET"])
def online_users(request):
    """
    Return list of users currently "online" (activity within 15 seconds on the matchmaker).
    Cached from polling the matchmaker; updated every 5 seconds.
    """
    return Response(get_cached_online_users())


@api_view(["POST"])
def heartbeat(request):
    """
    Record that the given user is still online. Called by the game-frontend every ~10 seconds
    while the user is on the game page. Forwards to matchmaker so the user stays in the 15s window.
    POST body: {"user_id": "<uuid>"}. Returns 204 on success.
    """
    user_id = request.data.get("user_id") if request.data else None
    if not user_id:
        return Response(
            {"detail": "Missing user_id."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    report_activity(user_id)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def login(request):
    """
    Validate a one-time ticket by calling the backend's one-time-token/validate endpoint.
    POST body: {"ticket": "<token>"}. On success returns user_id, username, app_id; on failure returns 401.
    Reports the user as active to the matchmaker so they appear "online".
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
            result = json.loads(body)
            user_id = result.get("user_id")
            if user_id:
                report_activity(user_id)
            return Response(result, status=resp.status)
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
