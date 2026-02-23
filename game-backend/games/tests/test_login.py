import io
import json
from unittest.mock import patch

import pytest
from django.test import Client
from urllib.error import HTTPError


@pytest.mark.django_db
def test_login_missing_ticket_returns_401():
    client = Client()
    response = client.get("/api/v1/login/")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing ticket."


@pytest.mark.django_db
def test_login_success_forwards_backend_response():
    client = Client()
    payload = {"user_id": "abc-123", "username": "player1", "app_id": "app-456"}

    class MockResponse:
        status = 200
        def read(self):
            return json.dumps(payload).encode("utf-8")
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    mock_resp = MockResponse()
    with patch("games.views.urllib.request.urlopen", return_value=mock_resp):
        response = client.get("/api/v1/login/", {"ticket": "some-token"})

    assert response.status_code == 200
    assert response.json() == payload


@pytest.mark.django_db
def test_login_backend_error_returns_401():
    client = Client()
    body_bytes = json.dumps({"detail": "Token has expired."}).encode("utf-8")

    def raise_401(*args, **kwargs):
        raise HTTPError(
            "/api/v1/one-time-token/validate/",
            401,
            "Unauthorized",
            {},
            io.BytesIO(body_bytes),
        )

    with patch("games.views.urllib.request.urlopen", side_effect=raise_401):
        response = client.get("/api/v1/login/", {"ticket": "expired-token"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Token has expired."
