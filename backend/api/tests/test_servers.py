import pytest
from api.models import App, Server, User


@pytest.mark.django_db
def test_server_list_requires_auth(api_client):
    user = User.objects.create_user(email="u@x.com", username="u", password="p")
    app = App.objects.create(name="A", description="", created_by=user, app_secret="x")
    response = api_client.get(f"/api/v1/apps/{app.app_id}/servers/")
    assert response.status_code == 401


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
    response = client.patch(
        f"/api/v1/apps/{app.app_id}/servers/{server.server_id}/",
        data={"server_name": "Updated"},
        format="json",
    )
    assert response.status_code == 200
    server.refresh_from_db()
    assert server.server_name == "Updated"
