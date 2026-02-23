"""
DRF authentication: support both user JWTs (simplejwt) and app JWTs.
When Bearer token is an app JWT, request.app is set and request.user is AnonymousUser.
"""
import jwt
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication
from .models import App

APP_JWT_ALGORITHM = "HS256"
APP_JWT_TOKEN_TYPE = "app"


class AppJWTAuthentication(authentication.BaseAuthentication):
    """
    Authenticate requests that present an app JWT (token_type "app", app_id in payload).
    Sets request.app and returns (AnonymousUser(), token) so that views can check request.app.
    Returns None if the token is not an app token, so JWTAuthentication can run next.
    """

    keyword = "Bearer"
    model = None

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request)
        if not auth_header:
            return None

        parts = auth_header.decode("utf-8").split()
        if parts[0] != self.keyword or len(parts) != 2:
            return None

        token_str = parts[1]
        try:
            payload = jwt.decode(
                token_str,
                settings.SECRET_KEY,
                algorithms=[APP_JWT_ALGORITHM],
            )
        except jwt.PyJWTError:
            return None

        if payload.get("token_type") != APP_JWT_TOKEN_TYPE:
            return None

        app_id = payload.get("app_id")
        if not app_id:
            return None

        try:
            app = App.objects.get(app_id=app_id)
        except App.DoesNotExist:
            return None

        # Attach app to request so views can use request.app
        request.app = app
        return (AnonymousUser(), token_str)
