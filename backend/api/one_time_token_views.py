"""
One-time use JWT: encodes user_id and app_id. Configurable TTL (default 5 minutes).
Only one valid per (user, app) at a time; consuming the token invalidates it.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import App, OneTimeToken

logger = logging.getLogger(__name__)

ONE_TIME_JWT_ALGORITHM = "HS256"
ONE_TIME_JWT_TTL_SECONDS = 300


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
    # Use Unix timestamps (UTC) in the JWT to avoid timezone ambiguity; PyJWT compares these to current time.
    iat_ts = int(now.timestamp())
    exp_ts = int(expires_at.timestamp())
    jti = secrets.token_urlsafe(32)

    # Enforce only one valid at a time: delete any existing for this (user, app)
    OneTimeToken.objects.filter(user=user, app=app).delete()
    OneTimeToken.objects.create(jti=jti, user=user, app=app, expires_at=expires_at)
    logger.info(
        "one-time token created in database: jti=%s user_id=%s app_id=%s expires_at=%s (exp_ts=%s)",
        jti,
        user.user_id,
        app.app_id,
        expires_at,
        exp_ts,
    )

    payload = {
        "jti": jti,
        "user_id": str(user.user_id),
        "app_id": str(app.app_id),
        "exp": exp_ts,
        "iat": iat_ts,
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
        logger.error(
            "one-time-token/validate failed: missing token — compared request.data.get('token')=%s (falsy), rejecting",
            repr(token_str),
        )
        return Response({"detail": "Missing token."}, status=status.HTTP_400_BAD_REQUEST)

    now = datetime.now(timezone.utc)
    try:
        payload = jwt.decode(
            token_str,
            settings.SECRET_KEY,
            algorithms=[ONE_TIME_JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        try:
            unverified = jwt.decode(
                token_str,
                settings.SECRET_KEY,
                algorithms=[ONE_TIME_JWT_ALGORITHM],
                options={"verify_exp": False},
            )
            exp_ts = unverified.get("exp")
            exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts is not None else None
            logger.error(
                "one-time-token/validate failed: token has expired — compared JWT exp=%s (exp_ts=%s) vs now=%s; exp < now => rejected",
                exp_dt,
                exp_ts,
                now,
            )
        except Exception:
            logger.error(
                "one-time-token/validate failed: token has expired — compared (could not decode for log: exp vs now); now=%s",
                now,
            )
        return Response({"detail": "Token has expired."}, status=status.HTTP_401_UNAUTHORIZED)
    except jwt.InvalidTokenError as e:
        logger.error(
            "one-time-token/validate failed: invalid token — jwt.decode raised InvalidTokenError: %s",
            e,
        )
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    jti = payload.get("jti")
    if not jti:
        logger.error(
            "one-time-token/validate failed: token payload missing jti — compared payload.get('jti')=%s, payload keys=%s; jti missing => rejected",
            repr(jti),
            list(payload.keys()),
        )
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        record = OneTimeToken.objects.select_related("user").get(jti=jti)
    except OneTimeToken.DoesNotExist:
        total_in_db = OneTimeToken.objects.count()
        logger.error(
            "one-time-token/validate failed: token already used or unknown jti — OneTimeToken.objects.get(jti=%s) => DoesNotExist. "
            "Diagnostic: total OneTimeToken rows in DB=%s (0 => wrong backend/DB or no tokens created here; >0 => this jti was already consumed or never inserted); rejecting",
            jti,
            total_in_db,
        )
        return Response({"detail": "Token already used or invalid."}, status=status.HTTP_401_UNAUTHORIZED)

    if record.expires_at < now:
        record.delete()
        logger.error(
            "one-time-token/validate failed: token expired — compared record.expires_at=%s vs now=%s; expires_at < now => rejected",
            record.expires_at,
            now,
        )
        return Response({"detail": "Token has expired."}, status=status.HTTP_401_UNAUTHORIZED)

    user_id = str(record.user_id)
    username = record.user.username
    app_id = str(record.app_id)
    logger.info(
        "one-time token marked as used: jti=%s user_id=%s app_id=%s (deleting from database)",
        jti,
        user_id,
        app_id,
    )
    record.delete()
    return Response({"user_id": user_id, "username": username, "app_id": app_id})
