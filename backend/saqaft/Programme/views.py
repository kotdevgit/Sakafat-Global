from rest_framework import viewsets

from .models import Programme
from .serializer import ProgrammeSerializer
from .permissions import ProgramePermission


class ProgrammeViewSet(viewsets.ModelViewSet):
    queryset = Programme.objects.all()
    serializer_class = ProgrammeSerializer
    permission_classes = [ProgramePermission]