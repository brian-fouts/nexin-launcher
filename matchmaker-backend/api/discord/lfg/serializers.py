from rest_framework import serializers

from api.models import LFGGroup, LFGMember


class LFGMemberSerializer(serializers.ModelSerializer):
    """Read representation of an LFG member (discord_id, joined_at)."""

    class Meta:
        model = LFGMember
        fields = ["discord_id", "joined_at"]


class LFGGroupCreateSerializer(serializers.ModelSerializer):
    """Create a looking-for-group session. created_by is Discord user id."""

    class Meta:
        model = LFGGroup
        fields = ["id", "created_at", "created_by", "start_time", "duration", "max_party_size", "description"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        return LFGGroup.objects.create(**validated_data)


class LFGGroupSerializer(serializers.ModelSerializer):
    """Read representation of an LFG group, including members and when they RSVP'd."""

    members = LFGMemberSerializer(many=True, read_only=True)

    class Meta:
        model = LFGGroup
        fields = [
            "id",
            "created_at",
            "created_by",
            "start_time",
            "duration",
            "max_party_size",
            "description",
            "members",
        ]
