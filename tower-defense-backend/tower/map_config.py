from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

MAP_DEFINITION_PATH = Path(__file__).resolve().parent / "data" / "map_definition.yaml"


def _as_float(value: Any, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid float for '{field_name}': {value!r}") from exc


def get_map_definition() -> dict:
    with MAP_DEFINITION_PATH.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle)

    if not isinstance(payload, dict):
        raise ValueError("Map definition YAML must be an object.")

    trees = payload.get("trees")
    enemy_path = payload.get("enemyPath")
    if not isinstance(trees, list):
        raise ValueError("Map definition must include a 'trees' list.")
    if not isinstance(enemy_path, list):
        raise ValueError("Map definition must include an 'enemyPath' list.")

    normalized_trees = []
    for tree in trees:
        if not isinstance(tree, dict):
            raise ValueError(f"Tree entries must be objects: {tree!r}")
        normalized_trees.append(
            {
                "x": _as_float(tree.get("x"), "trees[].x"),
                "z": _as_float(tree.get("z"), "trees[].z"),
                "trunkHeight": _as_float(tree.get("trunkHeight"), "trees[].trunkHeight"),
                "crownRadius": _as_float(tree.get("crownRadius"), "trees[].crownRadius"),
            }
        )

    normalized_enemy_path = []
    for point in enemy_path:
        if not isinstance(point, dict):
            raise ValueError(f"Enemy path entries must be objects: {point!r}")
        normalized_enemy_path.append(
            {
                "x": _as_float(point.get("x"), "enemyPath[].x"),
                "z": _as_float(point.get("z"), "enemyPath[].z"),
            }
        )

    return {
        "width": int(payload.get("width", 140)),
        "depth": int(payload.get("depth", 110)),
        "groundColor": str(payload.get("groundColor", "#4f8a3f")),
        "trees": normalized_trees,
        "enemyPath": normalized_enemy_path,
    }
