"""
App-level authentication: exchange app_id + app_secret for a JWT that authenticates as the app.
The JWT can be used with the same Bearer header; backend recognizes it via token_type "app" and app_id claim.
"""
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import App

APP_JWT_ALGORITHM = "HS256"
APP_JWT_TOKEN_TYPE = "app"
# Access token lifetime for app JWTs (same as user access in practice)
APP_JWT_ACCESS_LIFETIME = getattr(
    settings,
    "APP_JWT_ACCESS_TOKEN_LIFETIME",
    timedelta(minutes=60),
)


@api_view(["POST"])
@permission_classes([AllowAny])
def app_token(request):
    """
    Exchange app_id and app_secret for a JWT that authenticates as the app.
    Body: { "app_id": "<uuid>", "app_secret": "<plaintext>" }
    Response: { "access": "<jwt>" }
    """
    app_id = request.data.get("app_id")
    app_secret = request.data.get("app_secret")

    if not app_id:
        return Response(
            {"detail": "app_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not app_secret:
        return Response(
            {"detail": "app_secret is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        app = App.objects.get(app_id=app_id)
    except App.DoesNotExist:
        return Response(
            {"detail": "Invalid app_id or app_secret."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not check_password(app_secret, app.app_secret):
        return Response(
            {"detail": "Invalid app_id or app_secret."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    now = datetime.now(timezone.utc)
    expires_at = now + APP_JWT_ACCESS_LIFETIME
    payload = {
        "token_type": APP_JWT_TOKEN_TYPE,
        "app_id": str(app.app_id),
        "exp": expires_at,
        "iat": now,
    }
    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=APP_JWT_ALGORITHM,
    )
    if hasattr(token, "decode"):
        token = token.decode("utf-8")

    return Response({
        "access": token,
        "expires_in": int(APP_JWT_ACCESS_LIFETIME.total_seconds()),
    })
