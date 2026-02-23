import pytest

from api.models import Item


@pytest.mark.django_db
def test_item_list_empty(api_client):
    response = api_client.get("/api/v1/items/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_item_create(api_client, item_payload):
    response = api_client.post("/api/v1/items/", data=item_payload, format="json")
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == item_payload["name"]
    assert data["description"] == item_payload["description"]
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.django_db
def test_item_create_validation_fails(api_client):
    response = api_client.post("/api/v1/items/", data={"description": "No name"}, format="json")
    assert response.status_code == 400
    assert "name" in response.json()


@pytest.mark.django_db
def test_item_detail_get(api_client, item_payload):
    item = Item.objects.create(**item_payload)
    response = api_client.get(f"/api/v1/items/{item.id}/")
    assert response.status_code == 200
    assert response.json()["name"] == item_payload["name"]


@pytest.mark.django_db
def test_item_detail_404(api_client):
    response = api_client.get("/api/v1/items/99999/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_item_update_put(api_client, item_payload):
    item = Item.objects.create(**item_payload)
    response = api_client.put(
        f"/api/v1/items/{item.id}/",
        data={"name": "Updated", "description": "Updated desc"},
        format="json",
    )
    assert response.status_code == 200
    item.refresh_from_db()
    assert item.name == "Updated"


@pytest.mark.django_db
def test_item_update_patch(api_client, item_payload):
    item = Item.objects.create(**item_payload)
    response = api_client.patch(f"/api/v1/items/{item.id}/", data={"name": "Patched"}, format="json")
    assert response.status_code == 200
    item.refresh_from_db()
    assert item.name == "Patched"
    assert item.description == item_payload["description"]


@pytest.mark.django_db
def test_item_delete(api_client, item_payload):
    item = Item.objects.create(**item_payload)
    response = api_client.delete(f"/api/v1/items/{item.id}/")
    assert response.status_code == 204
    assert not Item.objects.filter(pk=item.id).exists()
