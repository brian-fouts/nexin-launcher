"""
In-memory registry of active rooms for status reporting to the matchmaker.
room_id -> { "capacity": int, "current_players": [user_id, ...] }
Updated by game consumers when connections join/leave a room.
"""
import threading

_rooms: dict[str, dict] = {}
_lock = threading.Lock()


def register_room(room_id: str, capacity: int) -> None:
    with _lock:
        if room_id not in _rooms:
            _rooms[room_id] = {"capacity": capacity, "current_players": []}


def unregister_room(room_id: str) -> None:
    with _lock:
        _rooms.pop(room_id, None)


def add_player_to_room(room_id: str, user_id: str | None, capacity: int) -> None:
    with _lock:
        if room_id not in _rooms:
            _rooms[room_id] = {"capacity": capacity, "current_players": []}
        if user_id and user_id not in _rooms[room_id]["current_players"]:
            _rooms[room_id]["current_players"].append(user_id)


def remove_player_from_room(room_id: str, user_id: str | None) -> None:
    with _lock:
        if room_id not in _rooms:
            return
        if user_id and user_id in _rooms[room_id]["current_players"]:
            _rooms[room_id]["current_players"].remove(user_id)
        # Keep room in registry even when empty so matchmaker sees "0/2"; game can report it


def get_all_rooms_snapshot() -> list[dict]:
    """Return list of { room_id, capacity, current_players } for matchmaker status. Only rooms with at least one player.
    Returns a new list so the caller cannot mutate the registry."""
    with _lock:
        return [
            {
                "room_id": str(rid),
                "capacity": int(data["capacity"]),
                "current_players": list(data["current_players"]),
            }
            for rid, data in list(_rooms.items())
            if data.get("current_players")
        ]
