from rest_framework.permissions import BasePermission

class ContactPersmission(BasePermission):
    def has_permission(self, request, view):
        if request.method == "POST":
            return True
        return request.user.is_authenticated and request.user.is_staff