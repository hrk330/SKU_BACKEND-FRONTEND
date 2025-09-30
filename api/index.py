"""
Vercel serverless function entry point for Django application.
This file is required for Vercel to properly handle Django requests.
"""

import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pricegov.production_settings')

# Import Django WSGI application
from django.core.wsgi import get_wsgi_application

# Get the WSGI application
application = get_wsgi_application()

# Export for Vercel
def handler(request):
    return application(request)
