from django.db import IntegrityError
from django.db.models import DateTimeField
from django.db.models.functions import Now
from django.db.models.expressions import RawSQL
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.models import LFGGroup, LFGMember
from .serializers import LFGGroupCreateSerializer, LFGGroupSerializer, LFGMemberSerializer


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
    serializer = LFGGroupSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def lfg_detail(request, lfg_id):
    """Return the database record for the LFG group with the given id, including members."""
    try:
        group = LFGGroup.objects.prefetch_related("members").get(id=lfg_id)
    except LFGGroup.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(LFGGroupSerializer(group).data)


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
    return Response(
        LFGMemberSerializer(member).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["POST"])
def lfg_create(request):
    """
    Create a looking-for-group session.
    Body: created_by (Discord user id), start_time (ISO datetime), duration (float),
    optional max_party_size (int), optional description (str, max 2048).
    """
    serializer = LFGGroupCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    group = serializer.save()
    LFGMember.objects.get_or_create(lfg=group, discord_id=group.created_by)
    group = LFGGroup.objects.prefetch_related("members").get(pk=group.pk)
    return Response(LFGGroupSerializer(group).data, status=status.HTTP_201_CREATED)
