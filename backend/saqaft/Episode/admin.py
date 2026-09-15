from django.contrib import admin

from .models import Episode, EpisodeCategory


@admin.register(EpisodeCategory)
class EpisodeCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "position", "episode_count",)
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="episodes")
    def episode_count(self, category):
        return category.episodes.count()


# Below this, the homepage hero has to upscale the portrait crop.
HERO_MIN_WIDTH = 1040
HERO_MIN_HEIGHT = 1188


@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "artwork_size", "hero_artwork", "position", "is_active", "created_at",)
    list_filter = ("category", "is_active", "created_at",)
    search_fields = ("title", "description",)
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at",)
    list_select_related = ("category",)

    @admin.display(description="portrait")
    def hero_artwork(self, episode):
        if not episode.hero_image or not episode.hero_image_width:
            return "— cropped from card image"
        size = f"{episode.hero_image_width}x{episode.hero_image_height}"
        if episode.hero_image_width > episode.hero_image_height:
            # A landscape upload here defeats the purpose of the field.
            return f"{size} · not portrait"
        if episode.hero_image_width < HERO_MIN_WIDTH or episode.hero_image_height < HERO_MIN_HEIGHT:
            return f"{size} · low-res"
        return size

    @admin.display(description="card artwork")
    def artwork_size(self, episode):
        if not episode.image or not episode.image_width:
            return "— no image"
        size = f"{episode.image_width}x{episode.image_height}"
        if episode.image_width < HERO_MIN_WIDTH or episode.image_height < HERO_MIN_HEIGHT:
            # Only matters while no portrait image is supplied for the hero.
            suffix = "" if episode.hero_image else " · low-res for hero"
            return f"{size}{suffix}"
        return size
