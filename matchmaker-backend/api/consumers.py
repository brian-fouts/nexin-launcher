"""
WebSocket consumer for matchmaker UI updates.
Clients connect and receive broadcast events when apps, servers, or online users change.
"""
import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer

MATCHMAKER_GROUP = "matchmaker_updates"


class MatchmakerUpdatesConsumer(AsyncJsonWebsocketConsumer):
    """Clients join the matchmaker_updates group and receive { type, ... } events."""

    async def connect(self):
        await self.channel_layer.group_add(MATCHMAKER_GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(MATCHMAKER_GROUP, self.channel_name)

    async def matchmaker_update(self, event):
        """Send event to the client (type is used by Channels for routing; omit it in payload)."""
        payload = {k: v for k, v in event.items() if k != "type"}
        await self.send(text_data=json.dumps(payload))
