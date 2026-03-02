from django.urls import path

from games.consumers import CheckersConsumer

websocket_urlpatterns = [
    path("ws/checkers/", CheckersConsumer.as_asgi()),
]
