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


@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "position", "is_active", "created_at",)
    list_filter = ("category", "is_active", "created_at",)
    search_fields = ("title", "description",)
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at",)
    list_select_related = ("category",)
