from rest_framework.permissions import BasePermission


class ProgramePermission(BasePermission):

    def has_permission(self, request, view):

        if request.method == "GET":
            return request.user.is_authenticated

        return request.user.is_authenticated and request.user.is_staff