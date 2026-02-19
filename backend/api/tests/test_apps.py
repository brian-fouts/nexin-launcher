import pytest
from api.models import App, User


@pytest.mark.django_db
def test_app_list_requires_auth(api_client):
    response = api_client.get("/api/v1/apps/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_app_list_empty(authenticated_client):
    user, client = authenticated_client()
    response = client.get("/api/v1/apps/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_app_create_returns_secret_once(authenticated_client):
    user, client = authenticated_client()
    response = client.post(
        "/api/v1/apps/",
        data={"name": "My App", "description": "An app"},
        format="json",
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My App"
    assert data["description"] == "An app"
    assert "app_id" in data
    assert "app_secret" in data
    assert len(data["app_secret"]) > 0
    assert "created_by_username" in data
    assert data["created_by_username"] == user.username
    app = App.objects.get(app_id=data["app_id"])
    assert app.app_secret != data["app_secret"]


@pytest.mark.django_db
def test_app_detail_get_all_users(authenticated_client):
    user, client = authenticated_client()
    app = App.objects.create(name="A", description="D", created_by=user, app_secret="hashed")
    response = client.get(f"/api/v1/apps/{app.app_id}/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "A"
    assert "app_secret" not in data


@pytest.mark.django_db
def test_app_update_only_owner(authenticated_client, api_client):
    owner, client = authenticated_client()
    app = App.objects.create(name="A", description="D", created_by=owner, app_secret="hashed")
    other = User.objects.create_user(email="o@x.com", username="other", password="p")
    api_client.force_authenticate(user=other)
    response = api_client.patch(
        f"/api/v1/apps/{app.app_id}/",
        data={"name": "Hacked"},
        format="json",
    )
    assert response.status_code == 403
    response = client.patch(
        f"/api/v1/apps/{app.app_id}/",
        data={"name": "Updated"},
        format="json",
    )
    assert response.status_code == 200
    app.refresh_from_db()
    assert app.name == "Updated"


@pytest.mark.django_db
def test_app_delete_only_owner(authenticated_client, api_client):
    owner, client = authenticated_client()
    app = App.objects.create(name="A", description="D", created_by=owner, app_secret="hashed")
    other = User.objects.create_user(email="o@x.com", username="other", password="p")
    api_client.force_authenticate(user=other)
    response = api_client.delete(f"/api/v1/apps/{app.app_id}/")
    assert response.status_code == 403
    response = client.delete(f"/api/v1/apps/{app.app_id}/")
    assert response.status_code == 204
    assert not App.objects.filter(app_id=app.app_id).exists()


@pytest.mark.django_db
def test_app_regenerate_secret_only_owner(authenticated_client, api_client):
    owner, client = authenticated_client()
    app = App.objects.create(name="A", description="D", created_by=owner, app_secret="hashed")
    old_secret = app.app_secret
    response = client.post(f"/api/v1/apps/{app.app_id}/regenerate-secret/")
    assert response.status_code == 200
    data = response.json()
    assert "app_secret" in data
    assert len(data["app_secret"]) > 0
    app.refresh_from_db()
    assert app.app_secret != old_secret
    other = User.objects.create_user(email="o@x.com", username="other", password="p")
    api_client.force_authenticate(user=other)
    response = api_client.post(f"/api/v1/apps/{app.app_id}/regenerate-secret/")
    assert response.status_code == 403
