from django.apps import AppConfig

from .matchmaker_client import start_online_users_poller, start_status_poller
from .room_registry import get_all_rooms_snapshot


class GamesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "games"
    verbose_name = "Games"

    def ready(self):
        start_online_users_poller()
        start_status_poller(get_rooms_callback=get_all_rooms_snapshot)
