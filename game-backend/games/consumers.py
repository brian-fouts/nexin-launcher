"""
WebSocket consumer for checkers game. First user to join is black.
Uses module-level shared state so all connections see the same game.
"""
import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .checkers import (
    apply_move,
    board_to_state,
    check_winner,
    get_all_moves,
    initial_board,
)

CHECKERS_GROUP = "checkers_game"

# Shared game state (all consumers read/write this)
_game_state = {
    "board": None,
    "current_turn": "black",
    "black_channel": None,
    "red_channel": None,
    "winner": None,
    "must_continue": None,  # (row, col) if player must continue jumping with this piece
}


def _get_state():
    global _game_state
    if _game_state["board"] is None:
        _game_state["board"] = initial_board()
        _game_state["current_turn"] = "black"
        _game_state["black_channel"] = None
        _game_state["red_channel"] = None
        _game_state["winner"] = None
        _game_state["must_continue"] = None
    return _game_state


class CheckersConsumer(AsyncJsonWebsocketConsumer):
    """Single checkers game. First connect = black, second = red."""

    async def connect(self):
        await self.channel_layer.group_add(CHECKERS_GROUP, self.channel_name)
        await self.accept()
        state = _get_state()
        # Assign color: first to connect = black
        if state["black_channel"] is None:
            state["black_channel"] = self.channel_name
        elif state["red_channel"] is None:
            state["red_channel"] = self.channel_name
        await self._send_state_to_self()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(CHECKERS_GROUP, self.channel_name)
        state = _get_state()
        if state["black_channel"] == self.channel_name:
            state["black_channel"] = None
        if state["red_channel"] == self.channel_name:
            state["red_channel"] = None
        await self.channel_layer.group_send(
            CHECKERS_GROUP,
            {"type": "checkers_state", "state": self._build_state_for_channel(None)},
        )

    def _build_state_for_channel(self, channel_name):
        """Build state dict. channel_name=None for broadcast (no myColor)."""
        state = _get_state()
        board = state["board"]
        current_turn = state["current_turn"]
        black_channel = state["black_channel"]
        red_channel = state["red_channel"]
        winner = state["winner"] or check_winner(board)
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
        state = self._build_state_for_channel(self.channel_name)
        await self.send(text_data=json.dumps({"type": "state", **state}))

    async def checkers_state(self, event):
        """Receive broadcast state from channel layer."""
        state = event.get("state", {})
        # Include myColor for this connection
        full = self._build_state_for_channel(self.channel_name)
        await self.send(text_data=json.dumps({"type": "state", **full}))

    async def receive_json(self, content):
        msg_type = content.get("type")
        if msg_type == "move":
            await self._handle_move(content)
        elif msg_type == "reset":
            await self._handle_reset()

    async def _handle_move(self, content):
        state = _get_state()
        if state["winner"]:
            return
        from_pos = content.get("from")
        to_pos = content.get("to")
        if not from_pos or not to_pos or len(from_pos) != 2 or len(to_pos) != 2:
            return
        from_row, from_col = int(from_pos[0]), int(from_pos[1])
        to_row, to_col = int(to_pos[0]), int(to_pos[1])

        my_color = None
        if self.channel_name == state["black_channel"]:
            my_color = "black"
        elif self.channel_name == state["red_channel"]:
            my_color = "red"
        if not my_color or my_color != state["current_turn"]:
            return

        # If must_continue is set, player must move that piece (multi-jump)
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
        # Multi-jump: if we jumped and the same piece can jump again, must continue
        if jump:
            from .checkers import get_valid_jumps
            more_jumps = get_valid_jumps(state["board"], to_row, to_col)
            if more_jumps:
                state["must_continue"] = (to_row, to_col)
        if not state.get("must_continue"):
            state["current_turn"] = "red" if state["current_turn"] == "black" else "black"
        state["winner"] = check_winner(state["board"])

        await self.channel_layer.group_send(
            CHECKERS_GROUP,
            {"type": "checkers_state", "state": self._build_state_for_channel(None)},
        )

    async def _handle_reset(self):
        state = _get_state()
        state["board"] = initial_board()
        state["current_turn"] = "black"
        state["winner"] = None
        state["must_continue"] = None
        await self.channel_layer.group_send(
            CHECKERS_GROUP,
            {"type": "checkers_state", "state": self._build_state_for_channel(None)},
        )
