import pytest
from api.models import App, User


@pytest.mark.django_db
def test_app_token_success(api_client):
    user = User.objects.create_user(email="u@example.com", username="u", password="p")
    app = App.objects.create(name="Test", description="", created_by=user, app_secret="dummy")
    app.set_app_secret("my-plaintext-secret")
    response = api_client.post(
        "/api/v1/auth/app-token/",
        data={"app_id": str(app.app_id), "app_secret": "my-plaintext-secret"},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert "access" in data
    assert "expires_in" in data
    assert isinstance(data["expires_in"], int)
    # Decode and verify payload (same as app_auth_views)
    import jwt
    from django.conf import settings
    payload = jwt.decode(data["access"], settings.SECRET_KEY, algorithms=["HS256"])
    assert payload.get("token_type") == "app"
    assert payload.get("app_id") == str(app.app_id)
    assert "exp" in payload
    assert "iat" in payload


@pytest.mark.django_db
def test_app_token_invalid_secret(api_client):
    user = User.objects.create_user(email="u@example.com", username="u", password="p")
    app = App.objects.create(name="Test", description="", created_by=user, app_secret="dummy")
    app.set_app_secret("correct-secret")
    response = api_client.post(
        "/api/v1/auth/app-token/",
        data={"app_id": str(app.app_id), "app_secret": "wrong-secret"},
        format="json",
    )
    assert response.status_code == 401
    assert "detail" in response.json()


@pytest.mark.django_db
def test_app_token_invalid_app_id(api_client):
    import uuid
    response = api_client.post(
        "/api/v1/auth/app-token/",
        data={"app_id": str(uuid.uuid4()), "app_secret": "any"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_app_token_missing_app_id(api_client):
    response = api_client.post(
        "/api/v1/auth/app-token/",
        data={"app_secret": "secret"},
        format="json",
    )
    assert response.status_code == 400
    assert "app_id" in response.json().get("detail", "").lower()


@pytest.mark.django_db
def test_app_token_missing_app_secret(api_client):
    user = User.objects.create_user(email="u@example.com", username="u", password="p")
    app = App.objects.create(name="Test", description="", created_by=user, app_secret="x")
    response = api_client.post(
        "/api/v1/auth/app-token/",
        data={"app_id": str(app.app_id)},
        format="json",
    )
    assert response.status_code == 400
    assert "app_secret" in response.json().get("detail", "").lower()


@pytest.mark.django_db
def test_app_jwt_authenticates_as_app(api_client):
    """Using the app token in Authorization header sets request.app on the backend."""
    from api.authentication import AppJWTAuthentication

    user = User.objects.create_user(email="u@example.com", username="u", password="p")
    app = App.objects.create(name="Test", description="", created_by=user, app_secret="dummy")
    app.set_app_secret("my-secret")
    # Get app token
    resp = api_client.post(
        "/api/v1/auth/app-token/",
        data={"app_id": str(app.app_id), "app_secret": "my-secret"},
        format="json",
    )
    assert resp.status_code == 200
    access = resp.json()["access"]

    # Build a request with Bearer token and run our auth
    from rest_framework.test import APIRequestFactory
    factory = APIRequestFactory()
    request = factory.get("/api/v1/apps/", HTTP_AUTHORIZATION=f"Bearer {access}")
    auth = AppJWTAuthentication()
    user_result, token = auth.authenticate(request)
    assert user_result is not None
    assert not user_result.is_authenticated  # AnonymousUser
    assert getattr(request, "app", None) is not None
    assert request.app.app_id == app.app_id
