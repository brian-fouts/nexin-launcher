from rest_framework import serializers

from .models import App, Item, Server, User
from .models import generate_app_secret


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ["id", "name", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


# --- Auth ---


class UserSerializer(serializers.ModelSerializer):
    """Read-only user representation (no password)."""

    class Meta:
        model = User
        fields = ["user_id", "email", "username", "created_at", "updated_at", "last_login_at"]
        read_only_fields = ["user_id", "email", "username", "created_at", "updated_at", "last_login_at"]


class RegisterSerializer(serializers.ModelSerializer):
    """Sign up: email, username, password."""

    class Meta:
        model = User
        fields = ["email", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """Login with username or email + password."""

    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


# --- Apps ---


class AppListSerializer(serializers.ModelSerializer):
    """App in list/detail; no app_secret. Include creator username and user_id."""

    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    created_by_id = serializers.UUIDField(source="created_by.user_id", read_only=True)

    class Meta:
        model = App
        fields = ["app_id", "name", "description", "created_at", "updated_at", "created_by_username", "created_by_id"]
        read_only_fields = ["app_id", "created_at", "updated_at", "created_by_username", "created_by_id"]


class AppCreateSerializer(serializers.ModelSerializer):
    """Create app; response includes app_secret once."""

    class Meta:
        model = App
        fields = ["name", "description"]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user
        plaintext_secret = generate_app_secret()
        from django.contrib.auth.hashers import make_password
        app = App.objects.create(
            name=validated_data["name"],
            description=validated_data.get("description", ""),
            created_by=user,
            app_secret=make_password(plaintext_secret),
        )
        app._plaintext_secret = plaintext_secret  # only time we expose it
        return app


class AppUpdateSerializer(serializers.ModelSerializer):
    """Update name/description only."""

    class Meta:
        model = App
        fields = ["name", "description"]


# --- Servers ---


class ServerSerializer(serializers.ModelSerializer):
    """Server list/detail; include app_id and creator username."""

    app_id = serializers.UUIDField(source="app.app_id", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    created_by_id = serializers.UUIDField(source="created_by.user_id", read_only=True)

    class Meta:
        model = Server
        fields = [
            "server_id",
            "app_id",
            "server_name",
            "server_description",
            "game_modes",
            "created_by_id",
            "created_by_username",
            "ip_address",
            "created_at",
        ]
        read_only_fields = ["server_id", "app_id", "created_by_id", "created_by_username", "ip_address", "created_at"]


class ServerCreateSerializer(serializers.ModelSerializer):
    """Create server; app from URL, created_by and ip_address from request."""

    class Meta:
        model = Server
        fields = ["server_name", "server_description", "game_modes"]

    def create(self, validated_data):
        request = self.context.get("request")
        app = self.context.get("app")
        user = request.user
        ip = _get_client_ip(request)
        return Server.objects.create(
            app=app,
            server_name=validated_data["server_name"],
            server_description=validated_data.get("server_description", ""),
            game_modes=validated_data.get("game_modes") or {},
            created_by=user,
            ip_address=ip or None,
        )


def _get_client_ip(request):
    """Return client IP from request (X-Forwarded-For or REMOTE_ADDR)."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or ""
