from django.shortcuts import get_object_or_404
from rest_framework import viewsets

from .models import Programme
from .permissions import ProgramePermission
from .serializer import ProgrammeSerializer


class ProgrammeViewSet(viewsets.ModelViewSet):
    serializer_class = ProgrammeSerializer
    permission_classes = [ProgramePermission]

    def get_queryset(self):
        queryset = Programme.objects.all()
        user = self.request.user
        if not (user.is_authenticated and user.is_staff):
            # The public site only ever sees programmes that are published.
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if str(lookup_value).isdigit():
            filter_kwargs = {"pk": int(lookup_value)}
        else:
            filter_kwargs = {"slug": lookup_value}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj
