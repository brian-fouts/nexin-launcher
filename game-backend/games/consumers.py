"""
WebSocket consumer for checkers game. Supports multiple rooms; room_id from query string.
First user to join a room is black, second is red. Sends "identify" with user_id to report to matchmaker.
"""
import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings

from .checkers import (
    apply_move,
    board_to_state,
    check_winner,
    get_all_moves,
    initial_board,
)
from .room_registry import add_player_to_room, remove_player_from_room, unregister_room

CHECKERS_GROUP_PREFIX = "checkers_game_"

# room_id -> game state dict
_game_states: dict[str, dict] = {}


def _get_room_group(room_id: str) -> str:
    return f"{CHECKERS_GROUP_PREFIX}{room_id}"


def _get_state(room_id: str) -> dict:
    global _game_states
    if room_id not in _game_states:
        from .checkers import initial_board
        _game_states[room_id] = {
            "board": initial_board(),
            "current_turn": "black",
            "black_channel": None,
            "red_channel": None,
            "black_user_id": None,
            "red_user_id": None,
            "winner": None,
            "must_continue": None,
        }
    return _game_states[room_id]


def _get_capacity() -> int:
    try:
        import json as _json
        cfg = getattr(settings, "ROOM_CONFIG_JSON", "{}")
        if isinstance(cfg, str):
            cfg = _json.loads(cfg)
        return int(cfg.get("capacity_per_room", 2))
    except (TypeError, ValueError, KeyError):
        return 2


class CheckersConsumer(AsyncJsonWebsocketConsumer):
    """Checkers game; supports multiple rooms via room_id query param. Default room_id is 'default'."""

    def _room_id(self) -> str:
        qs = self.scope.get("query_string") or b""
        if isinstance(qs, bytes):
            qs = qs.decode("utf-8")
        params = parse_qs(qs)
        room_ids = params.get("room_id", [])
        return (room_ids[0] or "default").strip() or "default"

    async def connect(self):
        room_id = self._room_id()
        self._room_id_val = room_id
        group = _get_room_group(room_id)
        await self.channel_layer.group_add(group, self.channel_name)
        await self.accept()
        state = _get_state(room_id)
        capacity = _get_capacity()
        add_player_to_room(room_id, None, capacity)  # ensure room exists; user_id added on identify
        if state["black_channel"] is None:
            state["black_channel"] = self.channel_name
        elif state["red_channel"] is None:
            state["red_channel"] = self.channel_name
        await self._send_state_to_self()

    async def disconnect(self, close_code):
        room_id = getattr(self, "_room_id_val", "default")
        state = _get_state(room_id)
        my_user_id = None
        if state.get("black_channel") == self.channel_name:
            state["black_channel"] = None
            my_user_id = state.get("black_user_id")
            state["black_user_id"] = None
        elif state.get("red_channel") == self.channel_name:
            state["red_channel"] = None
            my_user_id = state.get("red_user_id")
            state["red_user_id"] = None
        remove_player_from_room(room_id, my_user_id)
        if state.get("black_channel") is None and state.get("red_channel") is None:
            unregister_room(room_id)
        group = _get_room_group(room_id)
        await self.channel_layer.group_discard(group, self.channel_name)
        await self.channel_layer.group_send(
            group,
            {"type": "checkers_state", "state": self._build_state_for_channel(room_id, None)},
        )

    def _build_state_for_channel(self, room_id: str, channel_name: str | None):
        state = _get_state(room_id)
        board = state["board"]
        current_turn = state["current_turn"]
        black_channel = state["black_channel"]
        red_channel = state["red_channel"]
        winner = state.get("winner") or check_winner(board)
        if winner:
            state["winner"] = winner

        my_color = None
        if channel_name == black_channel:
            my_color = "black"
        elif channel_name == red_channel:
            my_color = "red"

        valid_moves = []
        must_continue = state.get("must_continue")
        if my_color and my_color == current_turn and not winner:
            for fr, fc, tr, tc, _ in get_all_moves(board, my_color):
                if must_continue and (fr, fc) != tuple(must_continue):
                    continue
                valid_moves.append({"from": [fr, fc], "to": [tr, tc]})

        return {
            "board": board_to_state(board),
            "currentTurn": current_turn,
            "myColor": my_color,
            "winner": winner,
            "validMoves": valid_moves,
            "mustContinue": state.get("must_continue"),
        }

    async def _send_state_to_self(self):
        room_id = getattr(self, "_room_id_val", "default")
        state = self._build_state_for_channel(room_id, self.channel_name)
        await self.send(text_data=json.dumps({"type": "state", **state}))

    async def checkers_state(self, event):
        room_id = getattr(self, "_room_id_val", "default")
        full = self._build_state_for_channel(room_id, self.channel_name)
        await self.send(text_data=json.dumps({"type": "state", **full}))

    async def receive_json(self, content):
        msg_type = content.get("type")
        room_id = getattr(self, "_room_id_val", "default")
        if msg_type == "identify":
            user_id = content.get("user_id")
            if user_id:
                state = _get_state(room_id)
                if state.get("black_channel") == self.channel_name:
                    state["black_user_id"] = str(user_id)
                elif state.get("red_channel") == self.channel_name:
                    state["red_user_id"] = str(user_id)
                add_player_to_room(room_id, str(user_id), _get_capacity())
        elif msg_type == "move":
            await self._handle_move(content, room_id)
        elif msg_type == "reset":
            await self._handle_reset(room_id)

    async def _handle_move(self, content, room_id: str):
        state = _get_state(room_id)
        if state.get("winner"):
            return
        from_pos = content.get("from")
        to_pos = content.get("to")
        if not from_pos or not to_pos or len(from_pos) != 2 or len(to_pos) != 2:
            return
        from_row, from_col = int(from_pos[0]), int(from_pos[1])
        to_row, to_col = int(to_pos[0]), int(to_pos[1])

        my_color = None
        if self.channel_name == state.get("black_channel"):
            my_color = "black"
        elif self.channel_name == state.get("red_channel"):
            my_color = "red"
        if not my_color or my_color != state["current_turn"]:
            return

        must_continue = state.get("must_continue")
        if must_continue:
            mr, mc = must_continue
            if from_row != mr or from_col != mc:
                return

        moves = get_all_moves(state["board"], my_color)
        valid = any(
            m[0] == from_row and m[1] == from_col and m[2] == to_row and m[3] == to_col
            for m in moves
        )
        if not valid:
            return

        state["board"], jump = apply_move(
            state["board"], from_row, from_col, to_row, to_col
        )
        state["must_continue"] = None
        if jump:
            from .checkers import get_valid_jumps
            more_jumps = get_valid_jumps(state["board"], to_row, to_col)
            if more_jumps:
                state["must_continue"] = (to_row, to_col)
        if not state.get("must_continue"):
            state["current_turn"] = "red" if state["current_turn"] == "black" else "black"
        state["winner"] = check_winner(state["board"])

        group = _get_room_group(room_id)
        await self.channel_layer.group_send(
            group,
            {"type": "checkers_state", "state": self._build_state_for_channel(room_id, None)},
        )

    async def _handle_reset(self, room_id: str):
        state = _get_state(room_id)
        state["board"] = initial_board()
        state["current_turn"] = "black"
        state["winner"] = None
        state["must_continue"] = None
        group = _get_room_group(room_id)
        await self.channel_layer.group_send(
            group,
            {"type": "checkers_state", "state": self._build_state_for_channel(room_id, None)},
        )
