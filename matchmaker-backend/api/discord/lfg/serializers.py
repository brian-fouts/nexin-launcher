from rest_framework import serializers

from api.models import LFGGroup, LFGMember, User

from .service import create_lfg_group


def get_discord_id_to_username(discord_ids):
    """Return a dict mapping discord_id -> username (site username or discord_username) for linked accounts."""
    if not discord_ids:
        return {}
    users = User.objects.filter(discord_id__in=discord_ids).only("discord_id", "username", "discord_username")
    return {
        u.discord_id: (u.username or u.discord_username or u.discord_id)
        for u in users
    }


class LFGMemberSerializer(serializers.ModelSerializer):
    """Read representation of an LFG member (discord_id, username when linked, joined_at)."""

    username = serializers.SerializerMethodField()

    class Meta:
        model = LFGMember
        fields = ["discord_id", "username", "joined_at"]

    def get_username(self, obj):
        return self.context.get("discord_id_to_username", {}).get(obj.discord_id)


class LFGGroupCreateSerializer(serializers.ModelSerializer):
    """Create a looking-for-group session. created_by is set from request.user.discord_id."""

    class Meta:
        model = LFGGroup
        fields = ["id", "created_at", "created_by", "start_time", "duration", "max_party_size", "description"]
        read_only_fields = ["id", "created_at", "created_by"]

    def create(self, validated_data):
        request = self.context.get("request")
        created_by = request.user.discord_id if request and request.user else None
        return create_lfg_group(
            discord_id=created_by,
            start_time=validated_data["start_time"],
            duration=validated_data["duration"],
            max_party_size=validated_data.get("max_party_size"),
            description=validated_data.get("description", ""),
        )


class LFGGroupSerializer(serializers.ModelSerializer):
    """Read representation of an LFG group, including members and when they RSVP'd."""

    members = LFGMemberSerializer(many=True, read_only=True)
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model = LFGGroup
        fields = [
            "id",
            "created_at",
            "created_by",
            "created_by_username",
            "start_time",
            "duration",
            "max_party_size",
            "description",
            "members",
        ]

    def get_created_by_username(self, obj):
        return self.context.get("discord_id_to_username", {}).get(obj.created_by)
