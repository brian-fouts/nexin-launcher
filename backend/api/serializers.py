from rest_framework import serializers

from .models import App, Item, User
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
