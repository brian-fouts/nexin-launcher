import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer

from tower.map_config import get_map_definition

ROOM_STATE: dict[str, dict] = {}
GROUP_PREFIX = "tower_defense_room_"


def _initial_state() -> dict:
    return {
        "wave": 1,
        "gold": 300,
        "lives": 20,
        "towers": [],
        "enemies": [],
        "map": get_map_definition(),
    }


def _get_room_id(scope: dict) -> str:
    qs = scope.get("query_string", b"")
    if isinstance(qs, bytes):
        qs = qs.decode("utf-8")
    params = parse_qs(qs)
    room = (params.get("room", ["default"])[0] or "default").strip()
    return room or "default"


def _room_state(room_id: str) -> dict:
    if room_id not in ROOM_STATE:
        ROOM_STATE[room_id] = _initial_state()
    return ROOM_STATE[room_id]


class TowerDefenseConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = _get_room_id(self.scope)
        self.group_name = f"{GROUP_PREFIX}{self.room_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self._push_state()

    async def disconnect(self, _close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = payload.get("type")
        if msg_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        state = _room_state(self.room_id)

        if msg_type == "start_wave":
            state["wave"] += 1
            state["enemies"] = [
                {"id": f"wave-{state['wave']}-enemy-{i}", "progress": 0}
                for i in range(5)
            ]
        elif msg_type == "place_tower":
            tower_type = payload.get("towerType", "archer")
            x = float(payload.get("x", 0))
            z = float(payload.get("z", payload.get("y", 0)))
            cost = 100 if tower_type == "archer" else 175
            if state["gold"] >= cost:
                state["gold"] -= cost
                state["towers"].append(
                    {
                        "id": f"tower-{len(state['towers']) + 1}",
                        "towerType": tower_type,
                        "x": x,
                        "z": z,
                    }
                )
        await self.channel_layer.group_send(
            self.group_name, {"type": "broadcast_state", "state": state}
        )

    async def broadcast_state(self, event):
        await self.send(text_data=json.dumps({"type": "state", "state": event["state"]}))

    async def _push_state(self):
        await self.send(
            text_data=json.dumps({"type": "state", "state": _room_state(self.room_id)})
        )
