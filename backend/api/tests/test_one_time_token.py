import pytest
from api.models import App, OneTimeToken, User


@pytest.mark.django_db
def test_generate_requires_auth(api_client):
    user = User.objects.create_user(email="u@x.com", username="u", password="p")
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    response = api_client.post(f"/api/v1/apps/{app.app_id}/one-time-token/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_generate_returns_token(authenticated_client):
    user, client = authenticated_client()
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    response = client.post(f"/api/v1/apps/{app.app_id}/one-time-token/")
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data.get("expires_in") == 60
    assert OneTimeToken.objects.filter(user=user, app=app).count() == 1


@pytest.mark.django_db
def test_only_one_valid_at_a_time(authenticated_client):
    user, client = authenticated_client()
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    r1 = client.post(f"/api/v1/apps/{app.app_id}/one-time-token/")
    assert r1.status_code == 200
    token1 = r1.json()["token"]
    r2 = client.post(f"/api/v1/apps/{app.app_id}/one-time-token/")
    assert r2.status_code == 200
    token2 = r2.json()["token"]
    assert OneTimeToken.objects.filter(user=user, app=app).count() == 1
    # Validate token2 (current valid one)
    resp = client.post("/api/v1/one-time-token/validate/", data={"token": token2}, format="json")
    assert resp.status_code == 200
    assert resp.json()["user_id"] == str(user.user_id)
    assert resp.json()["username"] == user.username
    assert resp.json()["app_id"] == str(app.app_id)
    # token1 should be invalid (jti no longer in DB)
    resp1 = client.post("/api/v1/one-time-token/validate/", data={"token": token1}, format="json")
    assert resp1.status_code == 401


@pytest.mark.django_db
def test_validate_consumes_token(authenticated_client):
    user, client = authenticated_client()
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    gen = client.post(f"/api/v1/apps/{app.app_id}/one-time-token/")
    token = gen.json()["token"]
    resp1 = client.post("/api/v1/one-time-token/validate/", data={"token": token}, format="json")
    assert resp1.status_code == 200
    assert resp1.json()["user_id"] == str(user.user_id)
    assert resp1.json()["username"] == user.username
    assert resp1.json()["app_id"] == str(app.app_id)
    resp2 = client.post("/api/v1/one-time-token/validate/", data={"token": token}, format="json")
    assert resp2.status_code == 401


@pytest.mark.django_db
def test_validate_missing_token(api_client):
    response = api_client.post("/api/v1/one-time-token/validate/", data={}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_any_user_can_generate_for_any_app(authenticated_client, api_client):
    owner, _ = authenticated_client()
    app = App.objects.create(name="A", description="", created_by=owner, app_secret="x")
    other = User.objects.create_user(email="o@x.com", username="other", password="p")
    api_client.force_authenticate(user=other)
    response = api_client.post(f"/api/v1/apps/{app.app_id}/one-time-token/")
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    # Token should be for other user and this app
    validate_resp = api_client.post(
        "/api/v1/one-time-token/validate/",
        data={"token": data["token"]},
        format="json",
    )
    assert validate_resp.status_code == 200
    assert validate_resp.json()["user_id"] == str(other.user_id)
    assert validate_resp.json()["username"] == other.username
    assert validate_resp.json()["app_id"] == str(app.app_id)
