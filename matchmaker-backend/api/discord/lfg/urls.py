from django.urls import path

from . import views

urlpatterns = [
    path("", views.lfg_create),
    path("create-by-discord/", views.lfg_create_by_discord),
    path("groups/", views.lfg_group_list),
    path("my-rsvps/", views.lfg_my_rsvps),
    path("my-rsvps-by-discord/", views.lfg_my_rsvps_by_discord),
    path("my-rsvps/<uuid:lfg_id>/leave/", views.lfg_leave_mine),
    path("<uuid:lfg_id>/", views.lfg_detail),
    path("<uuid:lfg_id>/join/", views.lfg_join),
    path("<uuid:lfg_id>/leave/", views.lfg_leave),
]
