"""
Broadcast WebSocket events when apps, servers, or online users change.
Call from sync code (views, activity_store) so the matchmaker UI updates immediately.
"""
from asgiref.sync import async_to_sync

from api.consumers import MATCHMAKER_GROUP


def _send(event: dict) -> None:
    try:
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(MATCHMAKER_GROUP, {"type": "matchmaker.update", **event})
    except Exception:
        pass  # Don't break HTTP flow if WS broadcast fails


def notify_apps_changed() -> None:
    """Call after app create/update/delete."""
    _send({"kind": "apps"})


def notify_servers_changed(app_id: str) -> None:
    """Call after server add/update/delete for an app."""
    _send({"kind": "servers", "app_id": str(app_id)})


def notify_online_users_changed(app_id: str, server_id: str) -> None:
    """Call after activity is recorded for a server (user came online or heartbeat)."""
    _send({"kind": "online_users", "app_id": str(app_id), "server_id": str(server_id)})
