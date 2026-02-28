from django.urls import include, path

from . import interactions, views

urlpatterns = [
    path("", views.discord_root),
    path("interactions/", interactions.DiscordInteractionsView.as_view()),
    path("lfg/", include("api.discord.lfg.urls")),
]
