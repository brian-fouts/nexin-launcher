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

    # Maze should span full map width.
    min_tree_x = min(t["x"] for t in tree_points)
    max_tree_x = max(t["x"] for t in tree_points)
    assert min_tree_x <= -62
    assert max_tree_x >= 62

    enemy_path = payload["map"].get("enemyPath", [])
    assert len(enemy_path) >= 8
    assert enemy_path[0]["z"] < 0  # starts near top half
    assert enemy_path[-1]["z"] > 0  # ends toward bottom half

    # There should be exactly 5 horizontal walkway passes in the serpentine route.
    horizontal_segments = []
    for i in range(len(enemy_path) - 1):
        a = enemy_path[i]
        b = enemy_path[i + 1]
        if abs(a["z"] - b["z"]) < 0.001 and abs(a["x"] - b["x"]) >= 20:
            horizontal_segments.append((a, b))
    assert len(horizontal_segments) == 5

    # Horizontal direction should alternate left/right to form a serpentine opening.
    directions = []
    for a, b in horizontal_segments:
        directions.append(1 if (b["x"] - a["x"]) > 0 else -1)
    for i in range(1, len(directions)):
        assert directions[i] == -directions[i - 1]
