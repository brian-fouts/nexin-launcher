import logging
import os
import sys
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class FlushingStreamHandler(logging.StreamHandler):
    """StreamHandler that flushes after each emit so logs appear immediately (no buffering)."""

    def emit(self, record):
        super().emit(record)
        self.flush()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-change-in-production")

DEBUG = os.environ.get("DEBUG", "true").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,matchmaker-backend").split(",")

# api first so api.User is registered before anything that references AUTH_USER_MODEL (e.g. admin
# can still be loaded by migration discovery; with api first, User exists when it’s resolved).
INSTALLED_APPS = [
    "daphne",
    "api",
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Use Redis if REDIS_URL is set (required for multi-worker WebSocket broadcast). Else in-memory (single process only).
_redis_url = os.environ.get("REDIS_URL", "").strip()
if _redis_url:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [_redis_url]},
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
    }

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "nexin"),
        "USER": os.environ.get("POSTGRES_USER", "nexin"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "nexin"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "api.User"

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.AppJWTAuthentication",  # app JWT first (token_type "app")
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "USER_ID_FIELD": "user_id",  # our User model uses user_id (UUID) as PK, not id
    "USER_ID_CLAIM": "user_id",
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://matchmaker-frontend:5173",
).split(",")

# Discord OAuth2 (matchmaker account registration / login)
# Discord redirects to the frontend URL; frontend sends code to backend to exchange for tokens.
DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET", "")
DISCORD_FRONTEND_REDIRECT = os.environ.get(
    "DISCORD_FRONTEND_REDIRECT",
    "http://localhost:5173/discord-callback",
)
DISCORD_FRONTEND_REDIRECT_LINK = os.environ.get(
    "DISCORD_FRONTEND_REDIRECT_LINK",
    "http://localhost:5173/discord-link-callback",
)
DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize"
DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token"
DISCORD_USER_URL = "https://discord.com/api/users/@me"
DISCORD_OAUTH_SCOPES = "identify email"

# Discord bot (slash commands via Interactions Endpoint URL)
DISCORD_BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
DISCORD_PUBLIC_KEY = os.environ.get("DISCORD_PUBLIC_KEY", "")
# Optional: linked in /lfg reply (e.g. https://matchmaker.example.com)
MATCHMAKER_FRONTEND_URL = os.environ.get("MATCHMAKER_FRONTEND_URL", "")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "()": FlushingStreamHandler,
            "stream": sys.stderr,
            "formatter": "default",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
