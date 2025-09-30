"""
WSGI config for pricegov project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Use production settings for Vercel deployment
if os.environ.get('VERCEL'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pricegov.production_settings')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pricegov.settings')

application = get_wsgi_application()
