from rest_framework import serializers

from .models import Programme

PILLAR_LABELS_UR = {
    "ikhlakiat": "اخلاقیات",
    "idraak": "ادراک",
    "falah": "فلاح",
    "rabta": "رابطہ",
    "sama": "سماع",
}

STATUS_LABELS_UR = {
    "open": "کھلا ہے",
    "register_interest": "دلچسپی درج کرائیں",
    "upcoming": "جلد آ رہا ہے",
    "development": "زیرِ تیاری",
}


class ProgrammeSerializer(serializers.ModelSerializer):
    pillar_label = serializers.CharField(source="get_pillar_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    pillar_label_ur = serializers.SerializerMethodField()
    status_label_ur = serializers.SerializerMethodField()

    class Meta:
        model = Programme
        fields = [
            "id",
            "name",
            "name_ur",
            "slug",
            "pillar",
            "pillar_label",
            "pillar_label_ur",
            "description",
            "description_ur",
            "status",
            "status_label",
            "status_label_ur",
            "image",
            "position",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_pillar_label_ur(self, obj):
        return PILLAR_LABELS_UR.get(obj.pillar, obj.get_pillar_display())

    def get_status_label_ur(self, obj):
        return STATUS_LABELS_UR.get(obj.status, obj.get_status_display())

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        lang = ""
        if request:
            lang = request.query_params.get("lang") or request.headers.get("Accept-Language", "")
        if "ur" in lang.lower():
            if instance.name_ur:
                data["name"] = instance.name_ur
            if instance.description_ur:
                data["description"] = instance.description_ur
            data["pillar_label"] = PILLAR_LABELS_UR.get(instance.pillar, data.get("pillar_label"))
            data["status_label"] = STATUS_LABELS_UR.get(instance.status, data.get("status_label"))
        return data
