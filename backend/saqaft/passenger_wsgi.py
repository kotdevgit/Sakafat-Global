import os
import sys

# Ensure project directory is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

# Configure Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saqaft.settings")

# Load WSGI application for cPanel Phusion Passenger
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
