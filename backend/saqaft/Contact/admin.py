from django.contrib import admin
from .models import Contact

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("full_name","email","phone_number","subject","created_at",)
    list_filter = ("created_at",)
    search_fields = ("full_name","email","subject",)
    readonly_fields = ("created_at",)