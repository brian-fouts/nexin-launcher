from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("heartbeat/", views.heartbeat),
    path("login/", views.login),
    path("server/update/", views.online_users),
]
