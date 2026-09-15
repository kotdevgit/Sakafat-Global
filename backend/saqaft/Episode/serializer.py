from rest_framework import serializers

from .models import Episode, EpisodeCategory


class EpisodeSerializer(serializers.ModelSerializer):
    # The slug keeps the public shape stable even if a category is renamed.
    category = serializers.SlugRelatedField(
        slug_field="slug", queryset=EpisodeCategory.objects.all()
    )
    category_label = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Episode
        fields = [
            "id",
            "title",
            "slug",
            "category",
            "category_label",
            "description",
            "image",
            "image_width",
            "image_height",
            "hero_image",
            "hero_image_width",
            "hero_image_height",
            "image_alt",
            "video_url",
            "position",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
