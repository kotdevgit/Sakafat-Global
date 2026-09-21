from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Programme

@admin.register(Programme)
class ProgrammeAdmin(ModelAdmin):
    list_display = ("name", "name_ur", "pillar", "status", "position", "is_active", "created_at",)
    list_filter = ("status", "pillar", "is_active", "created_at",)
    search_fields = ("name", "name_ur", "description", "description_ur",)
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at",)