import pytest
from django.test import Client


@pytest.mark.django_db
def test_health_returns_ok():
    client = Client()
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "game-backend"
