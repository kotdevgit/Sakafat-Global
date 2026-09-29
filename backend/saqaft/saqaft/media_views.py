"""Serve public artwork and staff-only enquiry attachments from private Blob."""

from django.contrib.admin.views.decorators import staff_member_required
from django.core.files.storage import default_storage
from django.http import FileResponse, Http404


def media_file(request, name):
    if name.startswith("enquiries/"):
        return staff_member_required(_serve)(request, name)
    if name.startswith(("episodes/", "programmes/")):
        return _serve(request, name)
    raise Http404


def _serve(request, name):
    if name.startswith("/") or ".." in name.split("/"):
        raise Http404
    try:
        file = default_storage.open(name, "rb")
    except (FileNotFoundError, ValueError):
        raise Http404 from None
    return FileResponse(file, as_attachment=name.startswith("enquiries/"))
