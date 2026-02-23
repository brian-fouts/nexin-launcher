"""
Permission classes for app-level authentication.
"""
from rest_framework import permissions


class IsAppAuthenticated(permissions.BasePermission):
    """
    Allow only requests authenticated with an app JWT (request.app is set).
    """
    message = "App authentication required."

    def has_permission(self, request, view):
        return getattr(request, "app", None) is not None


class IsAuthenticatedOrApp(permissions.BasePermission):
    """
    Allow either user authentication (request.user) or app authentication (request.app).
    """
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True
        return getattr(request, "app", None) is not None
