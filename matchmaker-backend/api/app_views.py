import uuid
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .activity_store import get_online_user_ids, record_activity
from .models import App, User, generate_app_secret
from .permissions import IsAppAuthenticated
from .server_store import (
    add_server as store_add_server,
    delete_server as store_delete_server,
    get_server as store_get_server,
    list_servers as store_list_servers,
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
        return Response(AppListSerializer(app).data)

    if request.method == "DELETE":
        app.delete()
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
    )
    return Response(entry, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAppAuthenticated])
def app_activity(request):
    """
    Record that a user is active for the authenticated app (e.g. game-backend reports after login).
    Body: { "user_id": "<uuid>" }. A user is "online" if they have activity within 15 seconds.
    """
    user_id_str = request.data.get("user_id") if request.data else None
    if not user_id_str:
        return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user_id = uuid.UUID(user_id_str)
    except (TypeError, ValueError):
        return Response({"detail": "user_id must be a valid UUID."}, status=status.HTTP_400_BAD_REQUEST)
    app = getattr(request, "app", None)
    if not app:
        return Response({"detail": "App authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    if not User.objects.filter(user_id=user_id).exists():
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    record_activity(app.app_id, user_id)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAppAuthenticated])
def app_online_users(request):
    """
    Return users considered "online" for the authenticated app (activity within 15 seconds).
    Response: [ { "user_id": "<uuid>", "username": "..." }, ... ]
    """
    app = getattr(request, "app", None)
    if not app:
        return Response({"detail": "App authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    user_ids = get_online_user_ids(app.app_id)
    users = User.objects.filter(user_id__in=user_ids).values("user_id", "username")
    user_map = {str(u["user_id"]): u["username"] for u in users}
    result = [
        {"user_id": str(uid), "username": user_map.get(str(uid), "")}
        for uid in user_ids
    ]
    return Response(result)


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
        return Response(servers)

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
        return Response(entry, status=status.HTTP_201_CREATED)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


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
        return Response(server)

    created_by_id = server.get("created_by_id")
    if created_by_id is not None and str(request.user.user_id) != created_by_id:
        return Response(
            {"detail": "Only the server creator can modify or delete it."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "PATCH":
        update_data = {}
        for key in ("server_name", "server_description", "game_modes", "port", "game_frontend_url"):
            if key in request.data:
                update_data[key] = request.data[key]
        updated = store_update_server(app_id, server_id, update_data)
        return Response(updated)

    if request.method == "DELETE":
        store_delete_server(app_id, server_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
