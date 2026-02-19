from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import app_views, auth_views, one_time_token_views, views

urlpatterns = [
    path("health/", views.health),
    path("auth/register/", auth_views.register),
    path("auth/login/", auth_views.login),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("items/", views.item_list),
    path("items/<int:pk>/", views.item_detail),
    path("apps/", app_views.app_list),
    path("apps/<uuid:app_id>/", app_views.app_detail),
    path("apps/<uuid:app_id>/regenerate-secret/", app_views.app_regenerate_secret),
    path("apps/<uuid:app_id>/one-time-token/", one_time_token_views.one_time_token_generate),
    path("apps/<uuid:app_id>/servers/", app_views.server_list),
    path("apps/<uuid:app_id>/servers/<uuid:server_id>/", app_views.server_detail),
    path("one-time-token/validate/", one_time_token_views.one_time_token_validate),
]
