from django.http import JsonResponse
from django.views.decorators.http import require_GET

from tower.map_config import get_map_definition


@require_GET
def health(_request):
    return JsonResponse({"status": "ok", "service": "tower-defense-backend"})


@require_GET
def starter_config(_request):
    map_definition = get_map_definition()
    return JsonResponse(
        {
            "map": map_definition,
            "player": {"startingGold": 300, "startingLives": 20},
            "waves": {"startingWave": 1},
            "towers": [
                {"type": "archer", "cost": 100, "damage": 8, "range": 110},
                {"type": "cannon", "cost": 175, "damage": 20, "range": 90},
            ],
        }
    )
