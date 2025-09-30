#!/usr/bin/env python
"""
Script to create a superuser for the deployed Django application.
Run this after deployment to create an admin user.
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pricegov.production_settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_superuser():
    username = input("Enter username: ")
    email = input("Enter email: ")
    password = input("Enter password: ")
    
    if User.objects.filter(username=username).exists():
        print(f"User {username} already exists!")
        return
    
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        first_name=input("Enter first name: "),
        last_name=input("Enter last name: "),
        phone=input("Enter phone number: "),
        role='gov_admin'
    )
    
    print(f"Superuser {username} created successfully!")

if __name__ == '__main__':
    create_superuser()
