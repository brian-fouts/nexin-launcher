import pytest
from django.utils import timezone

from api.models import User


@pytest.mark.django_db
def test_register_success(api_client):
    payload = {
        "email": "user@example.com",
        "username": "testuser",
        "password": "SecurePass123!",
    }
    response = api_client.post("/api/v1/auth/register/", data=payload, format="json")
    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    assert "tokens" in data
    user_data = data["user"]
    assert user_data["email"] == payload["email"]
    assert user_data["username"] == payload["username"]
    assert "user_id" in user_data
    assert "created_at" in user_data
    assert "updated_at" in user_data
    assert "last_login_at" in user_data
    assert "password" not in user_data
    assert len(data["tokens"]["access"]) > 0
    assert len(data["tokens"]["refresh"]) > 0
    user = User.objects.get(email=payload["email"])
    assert user.check_password(payload["password"])
    assert user.password != payload["password"]


@pytest.mark.django_db
def test_register_duplicate_email(api_client):
    User.objects.create_user(email="existing@example.com", username="existing", password="pass")
    payload = {"email": "existing@example.com", "username": "newuser", "password": "pass"}
    response = api_client.post("/api/v1/auth/register/", data=payload, format="json")
    assert response.status_code == 400
    assert "email" in response.json()


@pytest.mark.django_db
def test_register_duplicate_username(api_client):
    User.objects.create_user(email="a@example.com", username="taken", password="pass")
    payload = {"email": "b@example.com", "username": "taken", "password": "pass"}
    response = api_client.post("/api/v1/auth/register/", data=payload, format="json")
    assert response.status_code == 400
    assert "username" in response.json()


@pytest.mark.django_db
def test_register_validation_missing_fields(api_client):
    response = api_client.post("/api/v1/auth/register/", data={}, format="json")
    assert response.status_code == 400
    data = response.json()
    assert "email" in data or "username" in data or "password" in data


@pytest.mark.django_db
def test_login_success_returns_jwt(api_client):
    User.objects.create_user(email="u@example.com", username="u", password="secret")
    response = api_client.post(
        "/api/v1/auth/login/",
        data={"username": "u", "password": "secret"},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "tokens" in data
    assert data["user"]["username"] == "u"
    assert len(data["tokens"]["access"]) > 0
    assert len(data["tokens"]["refresh"]) > 0


@pytest.mark.django_db
def test_login_by_email(api_client):
    User.objects.create_user(email="e@example.com", username="u", password="secret")
    response = api_client.post(
        "/api/v1/auth/login/",
        data={"username": "e@example.com", "password": "secret"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "e@example.com"


@pytest.mark.django_db
def test_login_wrong_password(api_client):
    User.objects.create_user(email="u@example.com", username="u", password="secret")
    response = api_client.post(
        "/api/v1/auth/login/",
        data={"username": "u", "password": "wrong"},
        format="json",
    )
    assert response.status_code == 401
    assert "detail" in response.json()


@pytest.mark.django_db
def test_login_updates_last_login_at_not_updated_at(api_client):
    user = User.objects.create_user(email="u@example.com", username="u", password="secret")
    created_at = user.created_at
    updated_at = user.updated_at
    assert user.last_login_at is None
    response = api_client.post(
        "/api/v1/auth/login/",
        data={"username": "u", "password": "secret"},
        format="json",
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.last_login_at is not None
    assert user.updated_at == updated_at
    assert user.created_at == created_at


@pytest.mark.django_db
def test_jwt_authenticates_request(api_client):
    User.objects.create_user(email="u@example.com", username="u", password="secret")
    login_resp = api_client.post(
        "/api/v1/auth/login/",
        data={"username": "u", "password": "secret"},
        format="json",
    )
    token = login_resp.json()["tokens"]["access"]
    # Health doesn't require auth; use a hypothetical protected endpoint or items
    response = api_client.get(
        "/api/v1/items/",
        HTTP_AUTHORIZATION=f"Bearer {token}",
    )
    assert response.status_code == 200
