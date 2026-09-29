import os

from django.contrib import admin
from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static
from saqaft.media_views import media_file
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/',include("User.urls")),
    path('api/',include("Programme.urls")),
    path('api/',include("Episode.urls")),
    path('api/',include("Contact.urls"))
]

urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)

if not settings.DEBUG and os.environ.get("BLOB_READ_WRITE_TOKEN"):
    urlpatterns += [path("media/<path:name>", media_file)]
