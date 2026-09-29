"""Vercel's Python function entry point for the Django application."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saqaft.settings")
app = get_wsgi_application()
