from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def discord_root(request):
    """Discord integration root. Discord commands are routed under subpaths (e.g. /discord/commands/...)."""
    return Response({"discord": "integration", "status": "ok"})
