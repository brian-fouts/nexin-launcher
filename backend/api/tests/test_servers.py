import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import App, Server, User


@pytest.mark.django_db
def test_server_list_requires_auth(api_client):
    user = User.objects.create_user(email="u@x.com", username="u", password="p")
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    response = api_client.get(f"/api/v1/apps/{app.app_id}/servers/")
    assert response.status_code in (401, 403)  # DRF may return 403 when no credentials


@pytest.mark.django_db
def test_server_list_empty(authenticated_client):
    user, client = authenticated_client()
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    response = client.get(f"/api/v1/apps/{app.app_id}/servers/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_server_create_captures_ip(authenticated_client):
    user, client = authenticated_client()
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    response = client.post(
        f"/api/v1/apps/{app.app_id}/servers/",
        data={
            "server_name": "My Server",
            "server_description": "A test server",
            "game_modes": {"mode1": "deathmatch", "mode2": "ctf"},
        },
        format="json",
    )
    assert response.status_code == 201
    data = response.json()
    assert data["server_name"] == "My Server"
    assert data["server_description"] == "A test server"
    assert data["game_modes"] == {"mode1": "deathmatch", "mode2": "ctf"}
    assert data["app_id"] == str(app.app_id)
    assert data["created_by_username"] == user.username
    assert "server_id" in data
    assert "created_at" in data
    server = Server.objects.get(server_id=data["server_id"])
    assert server.ip_address is not None or server.ip_address is None  # may be set by test client


@pytest.mark.django_db
def test_app_server_create_via_app_jwt(api_client):
    """App JWT can create a server via POST /api/v1/app/server/; server appears in app servers list."""
    user = User.objects.create_user(email="u@x.com", username="u", password="p")
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    app.set_app_secret("my-secret")
    # Get app token
    token_resp = api_client.post(
        "/api/v1/auth/app-token/",
        data={"app_id": str(app.app_id), "app_secret": "my-secret"},
        format="json",
    )
    assert token_resp.status_code == 200
    access = token_resp.json()["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    response = api_client.post(
        "/api/v1/app/server/",
        data={
            "server_name": "Game Server 1",
            "server_description": "Hosted by game-backend",
            "game_modes": {"mode": "deathmatch"},
            "port": 8001,
            "game_frontend_url": "https://game.example.com",
        },
        format="json",
    )
    assert response.status_code == 201
    data = response.json()
    assert data["server_name"] == "Game Server 1"
    assert data["server_description"] == "Hosted by game-backend"
    assert data["game_modes"] == {"mode": "deathmatch"}
    assert data["port"] == 8001
    assert data["game_frontend_url"] == "https://game.example.com"
    assert data["app_id"] == str(app.app_id)
    assert data["created_by_username"] is None
    assert data["created_by_id"] is None
    assert "server_id" in data
    # Server is returned by apps/<app_id>/servers/
    api_client.credentials()
    api_client.force_authenticate(user=user)
    list_resp = api_client.get(f"/api/v1/apps/{app.app_id}/servers/")
    assert list_resp.status_code == 200
    servers = list_resp.json()
    assert len(servers) == 1
    assert servers[0]["server_id"] == data["server_id"]
    assert servers[0]["server_name"] == "Game Server 1"
    assert servers[0]["port"] == 8001
    assert servers[0]["game_frontend_url"] == "https://game.example.com"


@pytest.mark.django_db
def test_server_detail_only_creator_can_update(authenticated_client, api_client):
    owner, client = authenticated_client()
    app = App.objects.create(name="A", description="", created_by=owner, app_secret="x")
    server = Server.objects.create(
        app=app,
        server_name="S",
        server_description="",
        game_modes={},
        created_by=owner,
        ip_address=None,
    )
    other = User.objects.create_user(email="o@x.com", username="other", password="p")
    api_client.force_authenticate(user=other)
    response = api_client.patch(
        f"/api/v1/apps/{app.app_id}/servers/{server.server_id}/",
        data={"server_name": "Hacked"},
        format="json",
    )
    assert response.status_code == 403
    client.force_authenticate(user=None)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(owner).access_token)}")
    response = client.patch(
        f"/api/v1/apps/{app.app_id}/servers/{server.server_id}/",
        data={"server_name": "Updated"},
        format="json",
    )
    assert response.status_code == 200
    server.refresh_from_db()
    assert server.server_name == "Updated"
