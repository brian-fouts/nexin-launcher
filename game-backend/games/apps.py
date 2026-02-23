from django.apps import AppConfig

from .matchmaker_client import start_online_users_poller


class GamesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "games"
    verbose_name = "Games"

    def ready(self):
        start_online_users_poller()
