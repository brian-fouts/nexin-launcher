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


class User(AbstractBaseUser):
    """
    Custom user with UUID primary key, unique email/username, and
    created_at / updated_at / last_login_at timestamps.
    Passwords are stored hashed and salted (Django default: PBKDF2).
    """

    user_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column="user_id",
    )
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
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


class Item(models.Model):
    """Example resource for API demonstration."""

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


def generate_app_secret():
    """Return a new random app secret (plaintext). Hash before storing."""
    return secrets.token_urlsafe(32)


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
