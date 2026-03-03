"""
In-memory store for rooms on a server. A room is created when a user clicks "Create room"
on the matchmaker; the creating user is automatically a member.
Cleared when the backend process restarts.
"""
import uuid
from datetime import datetime, timezone

# list of { "room_id", "app_id", "server_id", "created_by_id", "created_at", "member_ids": [str] }
_ROOMS: list[dict] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def list_rooms_for_server(app_id: uuid.UUID, server_id: uuid.UUID) -> list[dict]:
    a = str(app_id)
    s = str(server_id)
    return [r for r in _ROOMS if r["app_id"] == a and r["server_id"] == s]


def count_rooms_for_server(app_id: uuid.UUID, server_id: uuid.UUID) -> int:
    return len(list_rooms_for_server(app_id, server_id))


def create_room(
    *,
    app_id: uuid.UUID,
    server_id: uuid.UUID,
    created_by_id: uuid.UUID,
) -> dict | None:
    room_id = uuid.uuid4()
    created_at = _now_iso()
    entry = {
        "room_id": str(room_id),
        "app_id": str(app_id),
        "server_id": str(server_id),
        "created_by_id": str(created_by_id),
        "created_at": created_at,
        "member_ids": [str(created_by_id)],
    }
    _ROOMS.append(entry)
    return entry


def get_room(room_id: uuid.UUID) -> dict | None:
    rid = str(room_id)
    for r in _ROOMS:
        if r["room_id"] == rid:
            return r
    return None


def add_member_to_room(room_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    r = get_room(room_id)
    if not r:
        return False
    uid = str(user_id)
    if uid not in r["member_ids"]:
        r["member_ids"].append(uid)
    return True
