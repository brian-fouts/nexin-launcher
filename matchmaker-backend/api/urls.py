from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from . import app_auth_views, app_views, auth_views, discord_oauth_views, one_time_token_views, views

urlpatterns = [
    path("discord/", include("api.discord.urls")),
    path("health/", views.health),
    path("auth/register/", auth_views.register),
    path("auth/login/", auth_views.login),
    path("auth/me/", auth_views.me),
    path("auth/discord/authorize/", discord_oauth_views.discord_authorize),
    path("auth/discord/exchange/", discord_oauth_views.discord_exchange),
    path("auth/discord/link/authorize/", discord_oauth_views.discord_link_authorize),
    path("auth/discord/link/exchange/", discord_oauth_views.discord_link_exchange),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("auth/app-token/", app_auth_views.app_token),
    path("app/server/", app_views.app_server_create),
    path("app/activity/", app_views.app_activity),
    path("app/online-users/", app_views.app_online_users),
    path("apps/", app_views.app_list),
    path("apps/<uuid:app_id>/", app_views.app_detail),
    path("apps/<uuid:app_id>/regenerate-secret/", app_views.app_regenerate_secret),
    path("apps/<uuid:app_id>/one-time-token/", one_time_token_views.one_time_token_generate),
    path("apps/<uuid:app_id>/servers/", app_views.server_list),
    path("apps/<uuid:app_id>/servers/<uuid:server_id>/", app_views.server_detail),
    path("apps/<uuid:app_id>/servers/<uuid:server_id>/online-users/", app_views.server_online_users),
    path("one-time-token/validate/", one_time_token_views.one_time_token_validate),
]
