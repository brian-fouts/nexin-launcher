from django.urls import path

from tower.consumers import TowerDefenseConsumer

websocket_urlpatterns = [
    path("ws/tower-defense/", TowerDefenseConsumer.as_asgi()),
]
