import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-change-in-production")

DEBUG = os.environ.get("DEBUG", "true").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = os.environ.get(
    "ALLOWED_HOSTS", "localhost,127.0.0.1,game-backend"
).split(",")

INSTALLED_APPS = [
    "games",
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

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://frontend:5173",
).split(",")

# Backend service URL for one-time-token validation and matchmaker registration.
BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000").rstrip("/")

# Matchmaker app credentials: used to obtain app JWT and register this game server.
MATCHMAKING_APP_ID = os.environ.get("MATCHMAKING_APP_ID", "")
MATCHMAKING_SECRET = os.environ.get("MATCHMAKING_SECRET", "")

# Server registration (sent to backend when registering with matchmaker).
SERVER_NAME = os.environ.get("SERVER_NAME", "Game Server")
SERVER_DESCRIPTION = os.environ.get("SERVER_DESCRIPTION", "")
# JSON-encoded key-value pairs for game modes, e.g. '{"mode": "deathmatch"}'.
SERVER_GAME_MODES_JSON = os.environ.get("SERVER_GAME_MODES", "{}")
# Port this game server is running on (e.g. 8001).
SERVER_PORT = os.environ.get("SERVER_PORT", "8001")
# URL of the game frontend (client) for this server; used for Join links. No default.
GAME_FRONTEND_URL = os.environ.get("GAME_FRONTEND_URL", "").rstrip("/")
