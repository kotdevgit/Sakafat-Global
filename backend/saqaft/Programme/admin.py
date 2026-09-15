from django.contrib import admin
from .models import Programme

@admin.register(Programme)
class ProgrammeAdmin(admin.ModelAdmin):
    list_display = ("name","status","is_active","created_at",)
    list_filter = ("status","is_active","created_at",)
    search_fields = ("name","description",)
    readonly_fields = ("created_at","updated_at",)