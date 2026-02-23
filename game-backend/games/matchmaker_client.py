"""
Client for matchmaker-backend app-authenticated endpoints (activity, online-users).
Caches app JWT and refreshes when needed.
"""
import json
import threading
import time
import urllib.error
import urllib.request

from django.conf import settings

_cached_token: str | None = None
_cached_token_expires_at: float = 0
_token_lock = threading.Lock()

# Cached online users list; updated by poll thread. List of {"user_id": str, "username": str}.
_online_users: list[dict] = []
_online_users_lock = threading.Lock()


def _get_app_token() -> str | None:
    global _cached_token, _cached_token_expires_at
    with _token_lock:
        if _cached_token and time.time() < _cached_token_expires_at - 60:
            return _cached_token
    app_id = getattr(settings, "MATCHMAKING_APP_ID", "") or ""
    app_secret = getattr(settings, "MATCHMAKING_SECRET", "") or ""
    backend_url = getattr(settings, "BACKEND_URL", "").rstrip("/")
    if not app_id or not app_secret:
        return None
    url = f"{backend_url}/api/v1/auth/app-token/"
    data = json.dumps({"app_id": app_id, "app_secret": app_secret}).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, ValueError, json.JSONDecodeError):
        return None
    access = body.get("access")
    expires_in = body.get("expires_in", 3600)
    if not access:
        return None
    with _token_lock:
        _cached_token = access
        _cached_token_expires_at = time.time() + expires_in
    return access


def report_activity(user_id: str) -> bool:
    """Report that this user is active for our app. Returns True if the request succeeded."""
    token = _get_app_token()
    if not token:
        return False
    backend_url = getattr(settings, "BACKEND_URL", "").rstrip("/")
    url = f"{backend_url}/api/v1/app/activity/"
    data = json.dumps({"user_id": user_id}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status in (200, 204)
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, ValueError):
        return False


def _fetch_online_users() -> list[dict]:
    """Fetch online users from matchmaker. Returns list of { user_id, username }."""
    token = _get_app_token()
    if not token:
        return []
    backend_url = getattr(settings, "BACKEND_URL", "").rstrip("/")
    url = f"{backend_url}/api/v1/app/online-users/"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, ValueError, json.JSONDecodeError):
        return []


def _poll_online_users_loop():
    """Background loop: poll matchmaker every 5 seconds and update cached online users."""
    while True:
        users = _fetch_online_users()
        with _online_users_lock:
            global _online_users
            _online_users = users
        time.sleep(5)


def get_cached_online_users() -> list[dict]:
    """Return the cached list of online users (updated by poll loop)."""
    with _online_users_lock:
        return list(_online_users)


def start_online_users_poller():
    """Start the background thread that polls the matchmaker for online users."""
    t = threading.Thread(target=_poll_online_users_loop, daemon=True)
    t.start()
