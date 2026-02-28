"""
Discord OAuth2 authorization code flow for matchmaker account registration/login.
Discord redirects to DISCORD_FRONTEND_REDIRECT with ?code=...&state=...; frontend sends code to exchange endpoint.
See https://docs.discord.com/developers/topics/oauth2
"""
import hashlib
import hmac
import secrets
import urllib.parse
from base64 import urlsafe_b64encode

import requests
from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .auth_views import tokens_for_user
from .models import User
from .serializers import UserSerializer


def _make_state():
    """Return a state value and its HMAC for CSRF protection (no server session)."""
    nonce = secrets.token_urlsafe(32)
    sig = hmac.new(
        settings.SECRET_KEY.encode(),
        nonce.encode(),
        hashlib.sha256,
    ).hexdigest()
    return urlsafe_b64encode(f"{nonce}.{sig}".encode()).decode().rstrip("=")


def _verify_state(state):
    """Verify state HMAC; return True if valid."""
    if not state:
        return False
    try:
        import base64
        pad_len = (4 - len(state) % 4) % 4
        padded = state + "=" * pad_len
        decoded = base64.urlsafe_b64decode(padded)
        decoded_str = decoded.decode()
    except Exception:
        return False
    parts = decoded_str.split(".", 1)
    if len(parts) != 2:
        return False
    nonce, sig = parts
    expected = hmac.new(
        settings.SECRET_KEY.encode(),
        nonce.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, sig)


@api_view(["GET"])
@permission_classes([AllowAny])
def discord_authorize(request):
    """
    Redirect the user to Discord's authorization page.
    redirect_uri is DISCORD_FRONTEND_REDIRECT so Discord redirects to the frontend with the code.
    """
    client_id = getattr(settings, "DISCORD_CLIENT_ID", None)
    redirect_uri = getattr(settings, "DISCORD_FRONTEND_REDIRECT", None)
    if not client_id or not redirect_uri:
        return Response(
            {"detail": "Discord OAuth2 is not configured"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    state = _make_state()
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": getattr(settings, "DISCORD_OAUTH_SCOPES", "identify email"),
        "state": state,
    }
    url = f"{settings.DISCORD_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"
    return redirect(url)


@api_view(["POST"])
@permission_classes([AllowAny])
def discord_exchange(request):
    """
    Exchange code + state for user and JWT. Frontend calls this after Discord redirects to it with ?code=...&state=...
    Expects JSON body: { "code": "...", "state": "..." }.
    """
    code = request.data.get("code") if request.data else None
    state = request.data.get("state") if request.data else None
    if not code:
        return Response(
            {"detail": "missing_code", "error": "No authorization code received."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not _verify_state(state):
        return Response(
            {"detail": "invalid_state", "error": "Invalid or expired state."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    client_id = getattr(settings, "DISCORD_CLIENT_ID", None)
    client_secret = getattr(settings, "DISCORD_CLIENT_SECRET", None)
    redirect_uri = getattr(settings, "DISCORD_FRONTEND_REDIRECT", "")
    if not all((client_id, client_secret, redirect_uri)):
        return Response(
            {"detail": "not_configured", "error": "Discord OAuth2 is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    token_resp = requests.post(
        settings.DISCORD_TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    if token_resp.status_code != 200:
        return Response(
            {"detail": "token_exchange_failed", "error": "Could not exchange code for token."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        return Response(
            {"detail": "token_exchange_failed", "error": "Could not exchange code for token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_resp = requests.get(
        settings.DISCORD_USER_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if user_resp.status_code != 200:
        return Response(
            {"detail": "user_fetch_failed", "error": "Could not load Discord profile."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    discord_user = user_resp.json()
    discord_id = str(discord_user.get("id", ""))
    username = (discord_user.get("global_name") or discord_user.get("username") or "discord_user")[:150]
    discord_username = (discord_user.get("global_name") or discord_user.get("username") or "")[:150] or None
    email = discord_user.get("email") or None
    if not discord_id:
        return Response(
            {"detail": "user_fetch_failed", "error": "Could not load Discord profile."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    user, _ = User.objects.get_or_create_from_discord(
        discord_id=discord_id,
        username=username,
        email=email,
        discord_username=discord_username,
    )
    User.objects.filter(pk=user.pk).update(last_login_at=timezone.now())
    user.refresh_from_db()

    tokens = tokens_for_user(user)
    return Response({
        "user": UserSerializer(user).data,
        "tokens": tokens,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def discord_link_authorize(request):
    """
    Redirect the user to Discord to link their account.
    Uses DISCORD_FRONTEND_REDIRECT_LINK so the frontend knows to call link/exchange.
    """
    client_id = getattr(settings, "DISCORD_CLIENT_ID", None)
    redirect_uri = getattr(settings, "DISCORD_FRONTEND_REDIRECT_LINK", None)
    if not client_id or not redirect_uri:
        return Response(
            {"detail": "Discord OAuth2 is not configured"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    state = _make_state()
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": getattr(settings, "DISCORD_OAUTH_SCOPES", "identify email"),
        "state": state,
    }
    url = f"{settings.DISCORD_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"
    return redirect(url)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def discord_link_exchange(request):
    """
    Link Discord to the current account. Requires user JWT.
    Body: { "code": "...", "state": "..." }. Uses DISCORD_FRONTEND_REDIRECT_LINK for token exchange.
    """
    if getattr(request, "app", None):
        return Response(
            {"detail": "app_token_not_allowed", "error": "Use a user account to link Discord."},
            status=status.HTTP_403_FORBIDDEN,
        )
    code = request.data.get("code") if request.data else None
    state = request.data.get("state") if request.data else None
    if not code:
        return Response(
            {"detail": "missing_code", "error": "No authorization code received."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not _verify_state(state):
        return Response(
            {"detail": "invalid_state", "error": "Invalid or expired state."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    client_id = getattr(settings, "DISCORD_CLIENT_ID", None)
    client_secret = getattr(settings, "DISCORD_CLIENT_SECRET", None)
    redirect_uri = getattr(settings, "DISCORD_FRONTEND_REDIRECT_LINK", "")
    if not all((client_id, client_secret, redirect_uri)):
        return Response(
            {"detail": "not_configured", "error": "Discord OAuth2 is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    token_resp = requests.post(
        settings.DISCORD_TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    if token_resp.status_code != 200:
        return Response(
            {"detail": "token_exchange_failed", "error": "Could not exchange code for token."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        return Response(
            {"detail": "token_exchange_failed", "error": "Could not exchange code for token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_resp = requests.get(
        settings.DISCORD_USER_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if user_resp.status_code != 200:
        return Response(
            {"detail": "user_fetch_failed", "error": "Could not load Discord profile."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    discord_user = user_resp.json()
    discord_id = str(discord_user.get("id", ""))
    discord_username = (discord_user.get("global_name") or discord_user.get("username") or "")[:150] or None
    if not discord_id:
        return Response(
            {"detail": "user_fetch_failed", "error": "Could not load Discord profile."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    existing = User.objects.filter(discord_id=discord_id).exclude(pk=request.user.pk).first()
    if existing:
        return Response(
            {"detail": "discord_already_linked", "error": "This Discord account is already linked to another account."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.discord_id = discord_id
    request.user.discord_username = discord_username
    request.user.save(update_fields=["discord_id", "discord_username", "updated_at"])
    request.user.refresh_from_db()

    tokens = tokens_for_user(request.user)
    return Response({
        "user": UserSerializer(request.user).data,
        "tokens": tokens,
    })
