from django.test import Client


def test_health_endpoint_returns_ok():
    client = Client()
    response = client.get("/api/health/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"


def test_config_endpoint_contains_tree_clusters_and_minimum_tree_count():
    client = Client()
    response = client.get("/api/config/")
    assert response.status_code == 200
    payload = response.json()

    tree_points = payload["map"]["trees"]
    assert len(tree_points) >= 10

    # Validate the 3-cluster intent by checking occupancy in known x-bands.
    cluster_1 = [t for t in tree_points if t["x"] < -25]
    cluster_2 = [t for t in tree_points if -25 <= t["x"] <= 30]
    cluster_3 = [t for t in tree_points if t["x"] > 30]

    assert len(cluster_1) >= 3
    assert len(cluster_2) >= 3
    assert len(cluster_3) >= 3
