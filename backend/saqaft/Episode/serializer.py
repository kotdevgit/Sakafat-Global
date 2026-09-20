from rest_framework import serializers

from .models import Episode, EpisodeCategory


class EpisodeSerializer(serializers.ModelSerializer):
    # The slug keeps the public shape stable even if a category is renamed.
    category = serializers.SlugRelatedField(
        slug_field="slug", queryset=EpisodeCategory.objects.all()
    )
    category_label = serializers.CharField(source="category.name", read_only=True)
    category_label_ur = serializers.CharField(source="category.name_ur", read_only=True)

    class Meta:
        model = Episode
        fields = [
            "id",
            "title",
            "title_ur",
            "slug",
            "category",
            "category_label",
            "category_label_ur",
            "description",
            "description_ur",
            "image",
            "image_width",
            "image_height",
            "hero_image",
            "hero_image_width",
            "hero_image_height",
            "image_alt",
            "image_alt_ur",
            "video_url",
            "position",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        lang = ""
        if request:
            lang = request.query_params.get("lang") or request.headers.get("Accept-Language", "")
        if "ur" in lang.lower():
            if instance.title_ur:
                data["title"] = instance.title_ur
            if instance.description_ur:
                data["description"] = instance.description_ur
            if instance.category and instance.category.name_ur:
                data["category_label"] = instance.category.name_ur
            if instance.image_alt_ur:
                data["image_alt"] = instance.image_alt_ur
        return data
