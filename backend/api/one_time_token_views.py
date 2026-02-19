"""
One-time use JWT: encodes user_id and app_id, 60s TTL.
Only one valid per (user, app) at a time; consuming the token invalidates it.
"""
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import App, OneTimeToken

ONE_TIME_JWT_ALGORITHM = "HS256"
ONE_TIME_JWT_TTL_SECONDS = 60


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def one_time_token_generate(request, app_id):
    """Generate a one-time JWT for the current user and given app. Any user can generate for any app.
    Only one token is valid per (user, app) at a time; generating a new one invalidates the previous."""
    try:
        app = App.objects.get(app_id=app_id)
    except App.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    user = request.user
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=ONE_TIME_JWT_TTL_SECONDS)
    jti = secrets.token_urlsafe(32)

    # Enforce only one valid at a time: delete any existing for this (user, app)
    OneTimeToken.objects.filter(user=user, app=app).delete()
    OneTimeToken.objects.create(jti=jti, user=user, app=app, expires_at=expires_at)

    payload = {
        "jti": jti,
        "user_id": str(user.user_id),
        "app_id": str(app.app_id),
        "exp": expires_at,
        "iat": now,
    }
    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ONE_TIME_JWT_ALGORITHM,
    )
    if hasattr(token, "decode"):
        token = token.decode("utf-8")
    return Response({"token": token, "expires_in": ONE_TIME_JWT_TTL_SECONDS})


@api_view(["POST"])
@permission_classes([AllowAny])
def one_time_token_validate(request):
    """Validate and consume a one-time JWT. Returns user_id, username, and app_id. Token is invalid after one use."""
    token_str = request.data.get("token") if request.data else None
    if not token_str:
        return Response({"detail": "Missing token."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = jwt.decode(
            token_str,
            settings.SECRET_KEY,
            algorithms=[ONE_TIME_JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        return Response({"detail": "Token has expired."}, status=status.HTTP_401_UNAUTHORIZED)
    except jwt.InvalidTokenError:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    jti = payload.get("jti")
    if not jti:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        record = OneTimeToken.objects.select_related("user").get(jti=jti)
    except OneTimeToken.DoesNotExist:
        return Response({"detail": "Token already used or invalid."}, status=status.HTTP_401_UNAUTHORIZED)

    if record.expires_at < datetime.now(timezone.utc):
        record.delete()
        return Response({"detail": "Token has expired."}, status=status.HTTP_401_UNAUTHORIZED)

    user_id = str(record.user_id)
    username = record.user.username
    app_id = str(record.app_id)
    record.delete()
    return Response({"user_id": user_id, "username": username, "app_id": app_id})
