from rest_framework import serializers

from .models import Programme


class ProgrammeSerializer(serializers.ModelSerializer):
    pillar_label = serializers.CharField(source="get_pillar_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Programme
        fields = [
            "id",
            "name",
            "slug",
            "pillar",
            "pillar_label",
            "description",
            "status",
            "status_label",
            "image",
            "position",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
