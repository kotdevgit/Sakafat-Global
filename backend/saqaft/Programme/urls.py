from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProgrammeViewSet

router = DefaultRouter()

router.register("", ProgrammeViewSet, basename="programme")

urlpatterns = [
    path("programme/", include(router.urls)),
]