"""
In-memory store for user activity per app. Used to determine "online" users
(made a request within ONLINE_WINDOW_SECONDS). Cleared when the backend process restarts.
"""
import uuid
from datetime import datetime, timedelta, timezone

ONLINE_WINDOW_SECONDS = 15

# (app_id_str, user_id_str) -> last_activity_at (datetime UTC)
_activity: dict[tuple[str, str], datetime] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def record_activity(app_id: uuid.UUID, user_id: uuid.UUID) -> None:
    key = (str(app_id), str(user_id))
    _activity[key] = _now()


def get_online_user_ids(app_id: uuid.UUID) -> list[uuid.UUID]:
    """Return user_ids that have activity within ONLINE_WINDOW_SECONDS for this app."""
    cutoff = _now() - timedelta(seconds=ONLINE_WINDOW_SECONDS)
    app_id_str = str(app_id)
    return [
        uuid.UUID(user_id)
        for (a, user_id), at in _activity.items()
        if a == app_id_str and at >= cutoff
    ]
