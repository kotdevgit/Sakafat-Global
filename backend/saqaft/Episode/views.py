from django.shortcuts import get_object_or_404
from rest_framework import viewsets

from .models import Episode
from .permissions import EpisodePermission
from .serializer import EpisodeSerializer


class EpisodeViewSet(viewsets.ModelViewSet):
    serializer_class = EpisodeSerializer
    permission_classes = [EpisodePermission]

    def get_queryset(self):
        queryset = Episode.objects.select_related("category")
        user = self.request.user
        if not (user.is_authenticated and user.is_staff):
            # The public site only ever sees episodes that are published.
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        filter_kwargs = {"pk": int(lookup_value)} if str(lookup_value).isdigit() else {"slug": lookup_value}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj
