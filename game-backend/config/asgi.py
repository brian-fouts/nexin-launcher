import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi = get_asgi_application()

from config.routing import websocket_urlpatterns

# Use OriginValidator with "*" to allow WebSocket from any origin (e.g. game frontend on different host).
# AllowedHostsOriginValidator can reject cross-origin connections when frontend and API are on different hosts.
application = ProtocolTypeRouter(
    {
        "http": django_asgi,
        "websocket": OriginValidator(URLRouter(websocket_urlpatterns), ["*"]),
    }
)
