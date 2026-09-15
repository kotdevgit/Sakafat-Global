from rest_framework.permissions import SAFE_METHODS, BasePermission


class EpisodePermission(BasePermission):
    """Episodes are public to read; only staff may change them in the admin."""

    def has_permission(self, request, view):

        if request.method in SAFE_METHODS:
            return True

        return request.user.is_authenticated and request.user.is_staff
