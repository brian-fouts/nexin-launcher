from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


def tokens_for_user(user):
    """Return access and refresh token dict for user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """Create a new user. Returns user + JWT tokens."""
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    return Response(
        {
            "user": UserSerializer(user).data,
            "tokens": tokens_for_user(user),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """Authenticate by username (or email) + password. Returns user + JWT tokens. Updates last_login_at only (not updated_at)."""
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    username = data["username"]
    password = data["password"]

    # Allow login by username or email
    user = User.objects.filter(username=username).first() or User.objects.filter(email=username).first()
    if user is None or not user.check_password(password):
        return Response(
            {"detail": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    if not user.is_active:
        return Response(
            {"detail": "User account is disabled"},
            status=status.HTTP_403_FORBIDDEN,
        )

    now = timezone.now()
    User.objects.filter(pk=user.pk).update(last_login_at=now)

    user.refresh_from_db()
    return Response({
        "user": UserSerializer(user).data,
        "tokens": tokens_for_user(user),
    })
