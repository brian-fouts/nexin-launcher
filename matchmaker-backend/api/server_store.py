"""
In-memory store for the server list. Cleared when the backend process restarts.
Each entry is a dict with the same shape as the server list/detail API response.
"""
import uuid
from datetime import datetime, timezone

_SERVERS: list[dict] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def add_server(
    *,
    app_id: uuid.UUID,
    server_name: str,
    server_description: str = "",
    game_modes: dict | None = None,
    created_by_id: uuid.UUID | None = None,
    created_by_username: str | None = None,
    ip_address: str | None = None,
    port: int | None = None,
    game_frontend_url: str | None = None,
) -> dict:
    server_id = uuid.uuid4()
    created_at = _now_iso()
    entry = {
        "server_id": str(server_id),
        "app_id": str(app_id),
        "server_name": server_name,
        "server_description": server_description or "",
        "game_modes": game_modes or {},
        "created_by_id": str(created_by_id) if created_by_id else None,
        "created_by_username": created_by_username,
        "ip_address": ip_address,
        "port": port,
        "game_frontend_url": game_frontend_url,
        "created_at": created_at,
    }
    _SERVERS.append(entry)
    return entry


def list_servers(app_id: uuid.UUID) -> list[dict]:
    app_id_str = str(app_id)
    return [s for s in _SERVERS if s["app_id"] == app_id_str]


def get_server(app_id: uuid.UUID, server_id: uuid.UUID) -> dict | None:
    app_id_str = str(app_id)
    server_id_str = str(server_id)
    for s in _SERVERS:
        if s["app_id"] == app_id_str and s["server_id"] == server_id_str:
            return s
    return None


def update_server(app_id: uuid.UUID, server_id: uuid.UUID, data: dict) -> dict | None:
    entry = get_server(app_id, server_id)
    if not entry:
        return None
    for key in ("server_name", "server_description", "game_modes", "port", "game_frontend_url"):
        if key in data and data[key] is not None:
            entry[key] = data[key]
    return entry


def delete_server(app_id: uuid.UUID, server_id: uuid.UUID) -> bool:
    app_id_str = str(app_id)
    server_id_str = str(server_id)
    for i, s in enumerate(_SERVERS):
        if s["app_id"] == app_id_str and s["server_id"] == server_id_str:
            _SERVERS.pop(i)
            return True
    return False
