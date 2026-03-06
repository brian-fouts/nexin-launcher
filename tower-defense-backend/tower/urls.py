from django.urls import path

from tower.views import health, starter_config

urlpatterns = [
    path("health/", health, name="health"),
    path("config/", starter_config, name="starter-config"),
]
