from django.urls import include, path

from . import views

# Discord integration routes. Add subroutes here for Discord commands, e.g.:
# path("commands/", include("api.discord.commands.urls")),
urlpatterns = [
    path("", views.discord_root),
    path("lfg/", include("api.discord.lfg.urls")),
]
