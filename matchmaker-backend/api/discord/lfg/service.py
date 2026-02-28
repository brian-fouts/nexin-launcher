"""
Shared LFG creation logic for web (JWT auth) and Discord bot (interaction).
"""
from django.core.exceptions import ValidationError

from api.models import LFGGroup, LFGMember


def create_lfg_group(
    discord_id,
    start_time,
    duration,
    max_party_size=None,
    description="",
):
    """
    Create an LFG group with the given creator discord_id and add them as first member.
    Caller is responsible for validation (duration > 0, start_time, etc.).
    Returns the created LFGGroup.
    """
    discord_id = str(discord_id).strip()
    if not discord_id:
        raise ValidationError("discord_id is required.")
    if duration is None or (isinstance(duration, (int, float)) and duration <= 0):
        raise ValidationError("duration must be greater than 0.")
    description = (description or "")[:2048]
    group = LFGGroup.objects.create(
        created_by=discord_id,
        start_time=start_time,
        duration=float(duration),
        max_party_size=max_party_size,
        description=description,
    )
    LFGMember.objects.get_or_create(lfg=group, discord_id=discord_id)
    return group
