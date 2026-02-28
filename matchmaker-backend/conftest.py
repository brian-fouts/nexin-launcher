import pytest
from rest_framework.test import APIClient

from api.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """Create a user and return (user, client) with client authenticated via JWT (so auth classes see a valid Bearer token)."""

    def _make(user=None):
        if user is None:
            user = User.objects.create_user(
                email="auth@example.com",
                username="authuser",
                password="pass",
            )
        # Use real JWT so AppJWTAuthentication and JWTAuthentication see a valid token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
        return user, api_client

    return _make
