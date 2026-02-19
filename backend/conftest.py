import pytest
from rest_framework.test import APIClient

from api.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def item_payload():
    return {"name": "Test Item", "description": "A test description"}


@pytest.fixture
def authenticated_client(api_client):
    """Create a user and return (user, client) with client authenticated as that user."""

    def _make(user=None):
        if user is None:
            user = User.objects.create_user(
                email="auth@example.com",
                username="authuser",
                password="pass",
            )
        api_client.force_authenticate(user=user)
        return user, api_client

    return _make
