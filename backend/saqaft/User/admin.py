from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin, UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group, User
from unfold.admin import ModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import OTPVerification, PasswordResetOTP

# Django registers auth's User and Group with its own ModelAdmin, which renders
# unstyled under Unfold. Swap both for the Unfold-aware equivalents.
admin.site.unregister(User)
admin.site.unregister(Group)


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


class BaseOTPAdmin(ModelAdmin):
    list_display = ("user", "otp", "attempts", "is_verified", "created_at",)
    list_filter = ("is_verified", "created_at",)
    search_fields = ("user__username", "user__email",)
    readonly_fields = ("created_at",)
    list_select_related = ("user",)
    ordering = ("-created_at",)


@admin.register(OTPVerification)
class OTPVerificationAdmin(BaseOTPAdmin):
    pass


@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(BaseOTPAdmin):
    pass
