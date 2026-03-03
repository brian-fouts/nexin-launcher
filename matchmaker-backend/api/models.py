import secrets
import uuid
from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


class UserManager(BaseUserManager):
    """Custom manager for User with email and username."""

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        if not username:
            raise ValueError("Users must have a username")
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)  # salted, hashed via Django's default (PBKDF2)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, username, password, **extra_fields)

    def get_or_create_from_discord(self, discord_id, username, email=None, discord_username=None):
        """
        Get existing user by discord_id or create one (Discord OAuth2).
        email is optional; if missing we use a placeholder. username is our site username.
        discord_username is the Discord display name (stored for display/linking).
        """
        user = self.filter(discord_id=discord_id).first()
        if user:
            if discord_username is not None and user.discord_username != discord_username:
                user.discord_username = (discord_username or "")[:150]
                user.save(update_fields=["discord_username", "updated_at"])
            return user, False
        # Ensure unique username (Discord usernames are not globally unique)
        base_username = (username or "discord_user")[: 150 - 10]
        base_username = "".join(c for c in base_username if c.isalnum() or c in "._- ") or "user"
        unique_username = base_username
        n = 0
        while self.filter(username=unique_username).exists():
            n += 1
            suffix = str(n)
            unique_username = (base_username[: 150 - len(suffix) - 1] + "_" + suffix).strip()
        email = email or f"discord-{discord_id}@users.discord.placeholder"
        if self.filter(email=email).exists():
            email = f"discord-{discord_id}-{uuid.uuid4().hex[:8]}@users.discord.placeholder"
        user = self.model(
            email=self.normalize_email(email),
            username=unique_username,
            discord_id=discord_id,
            discord_username=(discord_username or "")[:150] if discord_username else None,
        )
        user.set_unusable_password()
        user.save(using=self._db)
        return user, True


class User(AbstractBaseUser):
    """
    Custom user with UUID primary key, unique email/username, and
    created_at / updated_at / last_login_at timestamps.
    Passwords are stored hashed and salted (Django default: PBKDF2).
    Can be linked to Discord via discord_id (OAuth2).
    """

    user_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column="user_id",
    )
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    discord_id = models.CharField(max_length=32, unique=True, null=True, blank=True, db_index=True)
    discord_username = models.CharField(max_length=150, null=True, blank=True)
    # password from AbstractBaseUser (salted/hashed via set_password)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        db_table = "api_user"

    def __str__(self):
        return self.username


def generate_app_secret():
    """Return a new random app secret (plaintext). Hash before storing."""
    return secrets.token_urlsafe(32)


# Supported hosting modes for an app (used in App.supported_modes).
APP_SUPPORTED_MODES = ("official_host", "community_host", "self_hosted")


class App(models.Model):
    """User-created app. Only the creator can update/delete or regenerate app_secret."""

    app_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column="app_id",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    app_secret = models.CharField(max_length=128)  # hashed; plaintext only in create/regenerate response
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    # Hosting modes: official_host (only app owner creates servers), community_host (users can request servers), self_hosted (users host themselves).
    supported_modes = models.JSONField(
        default=list,
        blank=True,
        help_text="List of supported hosting modes: official_host, community_host, self_hosted",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_apps",
    )

    class Meta:
        db_table = "api_app"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def set_app_secret(self, plaintext_secret):
        from django.contrib.auth.hashers import make_password
        self.app_secret = make_password(plaintext_secret)
        self.save()


class Server(models.Model):
    """An instance of an app that a user hosts. Created by a user; IP captured at creation."""

    server_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column="server_id",
    )
    app = models.ForeignKey(App, on_delete=models.CASCADE, related_name="servers")
    server_name = models.CharField(max_length=255)
    server_description = models.TextField(blank=True)
    game_modes = models.JSONField(default=dict, blank=True)  # free-form key-value pairs
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_servers",
        null=True,
        blank=True,
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True, unpack_ipv4=True)
    port = models.PositiveIntegerField(null=True, blank=True)
    game_frontend_url = models.URLField(max_length=512, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_server"
        ordering = ["-created_at"]

    def __str__(self):
        return self.server_name


class LFGGroup(models.Model):
    """Looking-for-group session created via Discord. Created by Discord user id."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column="id",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=32, db_index=True)  # Discord user id (snowflake)
    start_time = models.DateTimeField()
    duration = models.FloatField()
    max_party_size = models.PositiveIntegerField(null=True, blank=True)
    description = models.CharField(max_length=2048, blank=True)

    class Meta:
        db_table = "api_lfg_group"
        ordering = ["-created_at"]

    def __str__(self):
        return f"LFG {self.id} by {self.created_by}"


class LFGMember(models.Model):
    """User (by Discord id) joined to an LFG group. One membership per (lfg, discord_id)."""

    lfg = models.ForeignKey(
        LFGGroup,
        on_delete=models.CASCADE,
        related_name="members",
        db_column="lfg_id",
    )
    discord_id = models.CharField(max_length=32, db_index=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_lfg_member"
        ordering = ["joined_at"]
        constraints = [
            models.UniqueConstraint(fields=["lfg", "discord_id"], name="api_lfg_member_unique_lfg_discord"),
        ]

    def __str__(self):
        return f"{self.discord_id} in LFG {self.lfg_id}"


class OneTimeToken(models.Model):
    """Stored jti for one-time JWTs. One valid per (user, app); deleted when token is used."""

    jti = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="one_time_tokens",
    )
    app = models.ForeignKey(App, on_delete=models.CASCADE, related_name="one_time_tokens")
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "api_one_time_token"
        constraints = [
            models.UniqueConstraint(fields=["user", "app"], name="api_one_time_token_one_per_user_app"),
        ]
