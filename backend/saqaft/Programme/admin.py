from django.contrib import admin
from .models import Programme

@admin.register(Programme)
class ProgrammeAdmin(admin.ModelAdmin):
    list_display = ("name","pillar","status","position","is_active","created_at",)
    list_filter = ("status","pillar","is_active","created_at",)
    search_fields = ("name","description",)
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at","updated_at",)