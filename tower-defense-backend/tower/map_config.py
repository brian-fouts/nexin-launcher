from __future__ import annotations


def get_map_definition() -> dict:
    # Three tree clusters (4 trees each) for a total of 12 trees.
    return {
        "width": 120,
        "depth": 80,
        "groundColor": "#4f8a3f",
        "trees": [
            # Cluster 1
            {"x": -45, "z": -20, "trunkHeight": 2.8, "crownRadius": 2.4},
            {"x": -40, "z": -15, "trunkHeight": 2.3, "crownRadius": 2.0},
            {"x": -35, "z": -22, "trunkHeight": 2.9, "crownRadius": 2.5},
            {"x": -42, "z": -27, "trunkHeight": 2.4, "crownRadius": 2.1},
            # Cluster 2
            {"x": 6, "z": 24, "trunkHeight": 2.5, "crownRadius": 2.1},
            {"x": 12, "z": 18, "trunkHeight": 2.9, "crownRadius": 2.4},
            {"x": 16, "z": 25, "trunkHeight": 2.6, "crownRadius": 2.0},
            {"x": 9, "z": 30, "trunkHeight": 3.0, "crownRadius": 2.6},
            # Cluster 3
            {"x": 42, "z": -24, "trunkHeight": 2.4, "crownRadius": 2.2},
            {"x": 48, "z": -18, "trunkHeight": 2.8, "crownRadius": 2.4},
            {"x": 54, "z": -22, "trunkHeight": 2.7, "crownRadius": 2.2},
            {"x": 46, "z": -29, "trunkHeight": 3.1, "crownRadius": 2.7},
        ],
    }
