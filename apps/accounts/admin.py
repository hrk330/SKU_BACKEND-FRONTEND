from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin with role-based display."""
    
    list_display = (
        'email', 'username', 'get_full_name', 'role', 'is_verified', 
        'is_active', 'is_staff', 'date_joined'
    )
    list_filter = (
        'role', 'is_verified', 'is_active', 'is_staff', 'is_superuser', 
        'date_joined', 'last_login'
    )
    search_fields = ('email', 'username', 'first_name', 'last_name', 'phone')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'email', 'phone')
        }),
        ('Role & Permissions', {
            'fields': ('role', 'is_verified', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'phone', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ('date_joined', 'last_login')
    
    def get_full_name(self, obj):
        """Display full name with styling."""
        if obj.first_name and obj.last_name:
            return format_html(
                '<strong>{}</strong>',
                f"{obj.first_name} {obj.last_name}"
            )
        return format_html('<em>No name provided</em>')
    get_full_name.short_description = 'Full Name'
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request).select_related()
