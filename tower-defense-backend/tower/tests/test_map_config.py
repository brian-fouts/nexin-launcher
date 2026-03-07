import yaml

from tower import map_config


def test_map_definition_is_loaded_from_yaml_file():
    assert map_config.MAP_DEFINITION_PATH.exists()
    assert map_config.MAP_DEFINITION_PATH.suffix in {".yaml", ".yml"}

    with map_config.MAP_DEFINITION_PATH.open("r", encoding="utf-8") as handle:
        raw = yaml.safe_load(handle)

    loaded = map_config.get_map_definition()

    assert loaded["width"] == raw["width"]
    assert loaded["depth"] == raw["depth"]
    assert loaded["groundColor"] == raw["groundColor"]
    assert len(loaded["trees"]) == len(raw["trees"])
    assert len(loaded["enemyPath"]) == len(raw["enemyPath"])


def test_map_yaml_contains_serpentine_enemy_path():
    data = map_config.get_map_definition()
    path = data["enemyPath"]
    horizontal_segments = []
    for i in range(len(path) - 1):
        a = path[i]
        b = path[i + 1]
        if abs(a["z"] - b["z"]) < 0.001 and abs(a["x"] - b["x"]) >= 20:
            horizontal_segments.append((a, b))

    assert len(horizontal_segments) == 5


def test_map_yaml_has_five_full_width_horizontal_tree_rows_with_walkable_gaps():
    data = map_config.get_map_definition()
    trees = data["trees"]

    rows: dict[float, list[dict]] = {}
    for tree in trees:
        z = float(tree["z"])
        rows.setdefault(z, []).append(tree)

    # Maze should be exactly 5 horizontal rows.
    assert len(rows) == 5

    sorted_z = sorted(rows.keys())
    # Gaps between adjacent rows must be large enough for enemy movement corridors.
    for i in range(len(sorted_z) - 1):
        assert sorted_z[i + 1] - sorted_z[i] >= 10

    # Every row spans left-to-right map edges.
    for z in sorted_z:
        xs = [float(tree["x"]) for tree in rows[z]]
        assert min(xs) <= -62
        assert max(xs) >= 62
