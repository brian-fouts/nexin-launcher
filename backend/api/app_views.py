from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import App, generate_app_secret
from .serializers import AppCreateSerializer, AppListSerializer, AppUpdateSerializer


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
