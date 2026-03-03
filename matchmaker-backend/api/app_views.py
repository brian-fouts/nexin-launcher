import uuid
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .activity_store import get_online_user_ids, record_activity
from .models import App, User, generate_app_secret
from .ws_notify import notify_apps_changed, notify_online_users_changed, notify_servers_changed
from .permissions import IsAppAuthenticated
from .room_store import count_rooms_for_server, create_room as room_create, list_rooms_for_server
from .server_store import (
    add_server as store_add_server,
    delete_server as store_delete_server,
    get_server as store_get_server,
    get_server_room_status,
    list_servers as store_list_servers,
    set_server_room_status,
    update_server as store_update_server,
)
from .serializers import (
    AppCreateSerializer,
    AppListSerializer,
    AppServerCreateSerializer,
    AppUpdateSerializer,
    ServerCreateSerializer,
    ServerSerializer,
)
from .serializers import _get_client_ip


def _is_owner(request, app):
    return request.user and app.created_by_id == request.user.user_id


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def app_list(request):
    """List all apps (all users) or create an app (all users). Create response includes app_secret once."""
    if request.method == "GET":
        apps = App.objects.select_related("created_by").all()
        serializer = AppListSerializer(apps, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        serializer = AppCreateSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        app = serializer.save()
        data = AppListSerializer(app).data
        data["app_secret"] = getattr(app, "_plaintext_secret", None)
        notify_apps_changed()
        return Response(data, status=status.HTTP_201_CREATED)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def app_detail(request, app_id):
    """Get one app (all users). Update or delete only if creator."""
    try:
        app = App.objects.select_related("created_by").get(app_id=app_id)
    except App.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = AppListSerializer(app)
        return Response(serializer.data)

    if not _is_owner(request, app):
        return Response({"detail": "Only the app creator can modify or delete this app."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "PATCH":
        serializer = AppUpdateSerializer(app, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        notify_apps_changed()
        return Response(AppListSerializer(app).data)

    if request.method == "DELETE":
        app.delete()
        notify_apps_changed()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def app_regenerate_secret(request, app_id):
    """Regenerate app_secret. Only the creator. Response includes new app_secret once."""
    try:
        app = App.objects.get(app_id=app_id)
    except App.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not _is_owner(request, app):
        return Response({"detail": "Only the app creator can regenerate the secret."}, status=status.HTTP_403_FORBIDDEN)

    plaintext_secret = generate_app_secret()
    app.set_app_secret(plaintext_secret)
    return Response({"app_secret": plaintext_secret})


@api_view(["POST"])
@permission_classes([IsAppAuthenticated])
def app_server_create(request):
    """
    Create a server for the authenticated app (game server self-registration).
    Requires app JWT. Body: server_name, server_description, game_modes, port, game_frontend_url.
    Stored in memory; cleared on backend restart.
    """
    serializer = AppServerCreateSerializer(
        data=request.data,
        context={"request": request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    app = getattr(request, "app", None)
    if not app:
        return Response({"detail": "App authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    ip = _get_client_ip(request)
    entry = store_add_server(
        app_id=app.app_id,
        server_name=data["server_name"],
        server_description=data.get("server_description", ""),
        game_modes=data.get("game_modes") or {},
        created_by_id=None,
        created_by_username=None,
        ip_address=ip or None,
        port=data.get("port"),
        game_frontend_url=data.get("game_frontend_url") or None,
        room_config=data.get("room_config") or {},
    )
    notify_servers_changed(str(app.app_id))
    return Response(entry, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAppAuthenticated])
def app_activity(request):
    """
    Record that a user is active on a server for the authenticated app.
    Body: { "user_id": "<uuid>", "server_id": "<uuid>" }. A user is "online" on that server if activity within 15s.
    """
    data = request.data or {}
    user_id_str = data.get("user_id")
    server_id_str = data.get("server_id")
    if not user_id_str:
        return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not server_id_str:
        return Response({"detail": "server_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user_id = uuid.UUID(user_id_str)
        server_id = uuid.UUID(server_id_str)
    except (TypeError, ValueError):
        return Response({"detail": "user_id and server_id must be valid UUIDs."}, status=status.HTTP_400_BAD_REQUEST)
    app = getattr(request, "app", None)
    if not app:
        return Response({"detail": "App authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    if not User.objects.filter(user_id=user_id).exists():
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    record_activity(app.app_id, server_id, user_id)
    notify_online_users_changed(str(app.app_id), str(server_id))
    return Response(status=status.HTTP_204_NO_CONTENT)


def _online_users_for_server(app_id: uuid.UUID, server_id: uuid.UUID) -> list[dict]:
    """Return [ { "user_id": str, "username": str }, ... ] for this app+server (activity within 15 seconds)."""
    user_ids = get_online_user_ids(app_id, server_id)
    users = User.objects.filter(user_id__in=user_ids).values("user_id", "username")
    user_map = {str(u["user_id"]): u["username"] for u in users}
    return [
        {"user_id": str(uid), "username": user_map.get(str(uid), "")}
        for uid in user_ids
    ]


@api_view(["POST"])
@permission_classes([IsAppAuthenticated])
def app_status(request):
    """
    Game server reports status: list of rooms with capacity and current players.
    Body: { "server_id": "<uuid>", "rooms": [ { "room_id": "<uuid>", "capacity": int, "current_players": [ "<user_id>", ... ] }, ... ] }.
    """
    data = request.data or {}
    server_id_str = data.get("server_id")
    rooms = data.get("rooms")
    if not server_id_str:
        return Response({"detail": "server_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if rooms is None:
        return Response({"detail": "rooms is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(rooms, list):
        return Response({"detail": "rooms must be a list."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        server_id = uuid.UUID(server_id_str)
    except (TypeError, ValueError):
        return Response({"detail": "server_id must be a valid UUID."}, status=status.HTTP_400_BAD_REQUEST)
    app = getattr(request, "app", None)
    if not app:
        return Response({"detail": "App authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    server = store_get_server(app.app_id, server_id)
    if not server:
        return Response({"detail": "Server not found."}, status=status.HTTP_404_NOT_FOUND)
    normalized = []
    for r in rooms:
        if not isinstance(r, dict):
            continue
        rid = r.get("room_id")
        cap = r.get("capacity")
        players = r.get("current_players") or []
        if not rid:
            continue
        try:
            uuid.UUID(rid)
        except (TypeError, ValueError):
            continue
        current_players = [str(p) for p in players] if isinstance(players, list) else []
        if not current_players:
            continue
        normalized.append({
            "room_id": str(rid),
            "capacity": int(cap) if cap is not None else 0,
            "current_players": current_players,
        })
    set_server_room_status(str(server_id), normalized)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAppAuthenticated])
def app_online_users(request):
    """
    Return users considered "online" for the authenticated app on a given server.
    Query: server_id=<uuid> (required). Response: [ { "user_id": "<uuid>", "username": "..." }, ... ]
    """
    app = getattr(request, "app", None)
    if not app:
        return Response({"detail": "App authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    server_id_str = request.query_params.get("server_id")
    if not server_id_str:
        return Response({"detail": "server_id query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        server_id = uuid.UUID(server_id_str)
    except (TypeError, ValueError):
        return Response({"detail": "server_id must be a valid UUID."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(_online_users_for_server(app.app_id, server_id))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def server_online_users(request, app_id, server_id):
    """
    Return users considered "online" on this server (activity within 15 seconds).
    User JWT; any authenticated user can read. Used by matchmaker frontend.
    Response: [ { "user_id": "<uuid>", "username": "..." }, ... ]
    """
    try:
        App.objects.get(app_id=app_id)
    except App.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    app_uuid = app_id if isinstance(app_id, uuid.UUID) else uuid.UUID(app_id)
    server_uuid = server_id if isinstance(server_id, uuid.UUID) else uuid.UUID(server_id)
    server = store_get_server(app_uuid, server_uuid)
    if not server:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(_online_users_for_server(app_uuid, server_uuid))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def server_list(request, app_id):
    """List servers for an app, or create a server (any user). Stored in memory; cleared on backend restart."""
    try:
        app = App.objects.get(app_id=app_id)
    except App.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        servers = store_list_servers(app_id)
        return Response([_server_with_rooms(s, app_id) for s in servers])

    if request.method == "POST":
        serializer = ServerCreateSerializer(
            data=request.data,
            context={"request": request, "app": app},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        ip = _get_client_ip(request)
        user = request.user
        entry = store_add_server(
            app_id=app.app_id,
            server_name=data["server_name"],
            server_description=data.get("server_description", ""),
            game_modes=data.get("game_modes") or {},
            created_by_id=user.user_id,
            created_by_username=user.username,
            ip_address=ip or None,
            port=data.get("port"),
            game_frontend_url=data.get("game_frontend_url") or None,
        )
        notify_servers_changed(str(app.app_id))
        return Response(entry, status=status.HTTP_201_CREATED)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


def _enrich_room_status_with_usernames(status_data: dict | None) -> dict | None:
    """Enrich room_status.rooms so current_players is [ { user_id, username }, ... ]."""
    if not status_data or not status_data.get("rooms"):
        return status_data
    all_user_ids = []
    for r in status_data["rooms"]:
        for uid in r.get("current_players") or []:
            if isinstance(uid, str):
                all_user_ids.append(uid)
            elif isinstance(uid, dict) and uid.get("user_id"):
                all_user_ids.append(uid["user_id"])
    if not all_user_ids:
        return status_data
    try:
        user_ids_uuid = [uuid.UUID(uid) for uid in all_user_ids]
    except (TypeError, ValueError):
        return status_data
    users = User.objects.filter(user_id__in=user_ids_uuid).values("user_id", "username")
    username_map = {str(u["user_id"]): u["username"] or "" for u in users}
    enriched_rooms = []
    for r in status_data["rooms"]:
        room = dict(r)
        players = r.get("current_players") or []
        if players and isinstance(players[0], dict):
            enriched_rooms.append(room)
            continue
        room["current_players"] = [
            {"user_id": str(uid), "username": username_map.get(str(uid), "")}
            for uid in players
        ]
        enriched_rooms.append(room)
    return {"rooms": enriched_rooms, "updated_at": status_data.get("updated_at", "")}


def _server_with_rooms(server: dict, app_id: uuid.UUID) -> dict:
    """Enrich server dict with rooms list and last-reported room status (with usernames).
    Merge game-reported rooms with matchmaker-created rooms so all rooms are listed."""
    out = dict(server)
    matchmaker_rooms = list_rooms_for_server(app_id, uuid.UUID(server["server_id"]))
    out["rooms"] = matchmaker_rooms
    status_data = get_server_room_status(server["server_id"])
    capacity = (server.get("room_config") or {}).get("capacity_per_room") or 2
    reported = (status_data or {}).get("rooms") or []
    reported_ids = {r.get("room_id") for r in reported if r.get("room_id")}
    merged_rooms = list(reported)
    for mr in matchmaker_rooms:
        rid = mr.get("room_id")
        if not rid or rid in reported_ids:
            continue
        merged_rooms.append({
            "room_id": rid,
            "capacity": capacity,
            "current_players": list(mr.get("member_ids") or []),
        })
    merged_status = {"rooms": merged_rooms, "updated_at": (status_data or {}).get("updated_at", "")}
    out["room_status"] = _enrich_room_status_with_usernames(merged_status)
    return out


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def server_create_room(request, app_id, server_id):
    """
    Create a room on this server and add the current user to it.
    Returns 400 if server has no room_config or already has max_rooms active.
    """
    try:
        app = App.objects.get(app_id=app_id)
    except App.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    server = store_get_server(app_id, server_id)
    if not server:
        return Response(status=status.HTTP_404_NOT_FOUND)
    room_config = server.get("room_config") or {}
    max_rooms = room_config.get("max_rooms")
    if max_rooms is None:
        return Response(
            {"detail": "This server does not support multiple rooms."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        max_rooms = int(max_rooms)
    except (TypeError, ValueError):
        max_rooms = 0
    current_count = count_rooms_for_server(app_id, server_id)
    if current_count >= max_rooms:
        return Response(
            {"detail": f"Server has reached maximum rooms ({max_rooms})."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = request.user
    entry = room_create(
        app_id=app.app_id,
        server_id=server_id,
        created_by_id=user.user_id,
    )
    if not entry:
        return Response({"detail": "Failed to create room."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    # Return room and server info so frontend can redirect user to game with room_id
    return Response(
        {
            "room_id": entry["room_id"],
            "server_id": str(server_id),
            "app_id": str(app_id),
            "game_frontend_url": server.get("game_frontend_url"),
            "member_ids": entry["member_ids"],
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def server_detail(request, app_id, server_id):
    """Get, update, or delete a server. Only creator can PATCH/DELETE. Data is in memory."""
    try:
        app = App.objects.get(app_id=app_id)
    except App.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    server = store_get_server(app_id, server_id)
    if not server:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_server_with_rooms(server, app_id))

    created_by_id = server.get("created_by_id")
    if created_by_id is not None and str(request.user.user_id) != created_by_id:
        return Response(
            {"detail": "Only the server creator can modify or delete it."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "PATCH":
        update_data = {}
        for key in ("server_name", "server_description", "game_modes", "port", "game_frontend_url", "room_config"):
            if key in request.data:
                update_data[key] = request.data[key]
        updated = store_update_server(app_id, server_id, update_data)
        notify_servers_changed(str(app_id))
        return Response(updated)

    if request.method == "DELETE":
        store_delete_server(app_id, server_id)
        notify_servers_changed(str(app_id))
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
