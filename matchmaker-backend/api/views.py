from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    """Health check for load balancers and monitoring."""
    return Response({"status": "ok", "service": "nexin-backend"})
