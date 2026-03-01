from datetime import datetime, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import DateTimeField
from django.db.models.functions import Now
from django.db.models.expressions import RawSQL
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import LFGGroup, LFGMember
from .serializers import (
    LFGGroupCreateSerializer,
    LFGGroupSerializer,
    LFGMemberSerializer,
    get_discord_id_to_username,
)
from .service import create_lfg_group


@api_view(["GET"])
def lfg_group_list(request):
    """
    Return all LFG groups that are scheduled for the future or in progress.
    (start_time + duration is in the future.)
    """
    qs = (
        LFGGroup.objects.prefetch_related("members")
        .annotate(
            end_time=RawSQL(
                "start_time + (duration * interval '1 hour')",
                [],
                output_field=DateTimeField(),
            )
        )
        .filter(end_time__gt=Now())
        .order_by("start_time")
    )
    member_ids = list(
        LFGMember.objects.filter(lfg__in=qs).values_list("discord_id", flat=True).distinct()
    )
    creator_ids = list(qs.values_list("created_by", flat=True).distinct())
    discord_ids = list(set(member_ids) | set(creator_ids))
    context = {"discord_id_to_username": get_discord_id_to_username(discord_ids)}
    serializer = LFGGroupSerializer(qs, many=True, context=context)
    return Response(serializer.data)


@api_view(["GET"])
def lfg_detail(request, lfg_id):
    """Return the database record for the LFG group with the given id, including members."""
    try:
        group = LFGGroup.objects.prefetch_related("members").get(id=lfg_id)
    except LFGGroup.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    discord_ids = [m.discord_id for m in group.members.all()]
    context = {"discord_id_to_username": get_discord_id_to_username(discord_ids)}
    return Response(LFGGroupSerializer(group, context=context).data)


@api_view(["POST"])
def lfg_join(request, lfg_id):
    """
    Record that a user (Discord id) intends to join the group.
    Body: { "discord_id": "<string>" }. Idempotent: 200 if already a member, 201 if newly joined.
    """
    discord_id = (request.data or {}).get("discord_id")
    if not discord_id or not str(discord_id).strip():
        return Response(
            {"detail": "discord_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    discord_id = str(discord_id).strip()
    try:
        group = LFGGroup.objects.get(id=lfg_id)
    except LFGGroup.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    try:
        member, created = LFGMember.objects.get_or_create(
            lfg=group,
            discord_id=discord_id,
        )
    except IntegrityError:
        return Response(
            {"detail": "Already a member of this group."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    context = {"discord_id_to_username": get_discord_id_to_username([discord_id])}
    return Response(
        LFGMemberSerializer(member, context=context).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def lfg_create(request):
    """
    Create a looking-for-group session. created_by is set from the authenticated user's Discord id.
    Body: start_time (ISO datetime), duration (float), optional max_party_size (int), optional description (str).
    User must have Discord linked (discord_id set).
    """
    if getattr(request, "app", None):
        return Response(
            {"detail": "Use your user account to create an LFG group."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not request.user.discord_id:
        return Response(
            {"detail": "Link your Discord account to create an LFG group."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    serializer = LFGGroupCreateSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    group = serializer.save()
    group = LFGGroup.objects.prefetch_related("members").get(pk=group.pk)
    context = {"discord_id_to_username": get_discord_id_to_username([group.created_by])}
    return Response(LFGGroupSerializer(group, context=context).data, status=status.HTTP_201_CREATED)


def _check_bot_token(request):
    """Return True if request is authorized with DISCORD_BOT_TOKEN."""
    token = (request.headers.get("X-Discord-Bot-Token") or "").strip()
    expected = (getattr(settings, "DISCORD_BOT_TOKEN", "") or "").strip()
    return bool(expected) and token == expected


@api_view(["POST"])
def lfg_create_by_discord(request):
    """
    Create an LFG group by Discord id. Used by the Discord bot (discord.py) when users run /lfg.
    Auth: X-Discord-Bot-Token header must match DISCORD_BOT_TOKEN.
    Body: discord_id (required), duration (number, required), start_time (ISO string, optional),
          max_party_size (int, optional), description (string, optional).
    """
    if not _check_bot_token(request):
        return Response({"detail": "Invalid or missing bot token."}, status=status.HTTP_401_UNAUTHORIZED)

    data = request.data or {}
    discord_id = (data.get("discord_id") or "").strip() or None
    if not discord_id:
        return Response({"detail": "discord_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    duration = data.get("duration")
    if duration is None:
        return Response({"detail": "duration is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        duration = float(duration)
    except (TypeError, ValueError):
        return Response({"detail": "duration must be a number."}, status=status.HTTP_400_BAD_REQUEST)
    if duration <= 0:
        return Response({"detail": "duration must be greater than 0."}, status=status.HTTP_400_BAD_REQUEST)

    start_time_str = (data.get("start_time") or "").strip() or None
    if start_time_str:
        try:
            start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
            if start_time.tzinfo is None:
                start_time = timezone.make_aware(start_time)
        except (ValueError, TypeError):
            start_time = timezone.now() + timedelta(minutes=5)
    else:
        start_time = timezone.now() + timedelta(minutes=5)

    max_party_size = data.get("max_party_size")
    if max_party_size is not None:
        try:
            max_party_size = int(max_party_size)
            if max_party_size < 1:
                max_party_size = None
        except (TypeError, ValueError):
            max_party_size = None

    description = (data.get("description") or "") or ""

    try:
        group = create_lfg_group(
            discord_id=discord_id,
            start_time=start_time,
            duration=duration,
            max_party_size=max_party_size,
            description=description,
        )
    except ValidationError as e:
        msg = e.messages[0] if e.messages else str(e)
        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    frontend_url = (getattr(settings, "MATCHMAKER_FRONTEND_URL", "") or "").strip()
    link = f"{frontend_url.rstrip('/')}/lfg/{group.id}" if frontend_url else None
    return Response(
        {
            "id": str(group.id),
            "start_time": group.start_time.isoformat(),
            "duration": group.duration,
            "link": link,
        },
        status=status.HTTP_201_CREATED,
    )
