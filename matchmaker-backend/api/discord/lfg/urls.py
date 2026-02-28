from django.urls import path

from . import views

urlpatterns = [
    path("", views.lfg_create),
    path("groups/", views.lfg_group_list),
    path("<uuid:lfg_id>/", views.lfg_detail),
    path("<uuid:lfg_id>/join/", views.lfg_join),
]
