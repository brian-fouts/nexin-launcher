import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_health_returns_ok(api_client):
    response = api_client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "nexin-backend"


@pytest.mark.django_db
def test_health_rejects_post(api_client):
    response = api_client.post("/api/v1/health/")
    assert response.status_code == 405
