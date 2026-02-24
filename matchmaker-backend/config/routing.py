from django.urls import path

from api.consumers import MatchmakerUpdatesConsumer

websocket_urlpatterns = [
    path("ws/matchmaker/", MatchmakerUpdatesConsumer.as_asgi()),
]
