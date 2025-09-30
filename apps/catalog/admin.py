from django.contrib import admin
from django.utils.html import format_html
from .models import SKU


@admin.register(SKU)
class SKUAdmin(admin.ModelAdmin):
    """Admin interface for SKU model."""
    
    list_display = (
        'code', 'name', 'manufacturer', 'pack_size_kg', 
        'is_active', 'created_at'
    )
    list_filter = ('is_active', 'manufacturer', 'created_at')
    search_fields = ('code', 'name', 'manufacturer')
    ordering = ('name',)
    
    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'manufacturer', 'pack_size_kg')
        }),
        ('Details', {
            'fields': ('description', 'is_active'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request)
