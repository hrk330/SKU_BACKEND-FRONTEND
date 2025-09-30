from django.contrib import admin
from django.utils.html import format_html
from .models import Retailer


@admin.register(Retailer)
class RetailerAdmin(admin.ModelAdmin):
    """Admin interface for Retailer model."""
    
    list_display = (
        'business_name', 'license_no', 'user_email', 'district_name',
        'is_verified', 'is_active', 'created_at'
    )
    list_filter = ('is_verified', 'is_active', 'district', 'created_at')
    search_fields = ('business_name', 'license_no', 'user__email', 'contact_person')
    ordering = ('business_name',)
    
    fieldsets = (
        ('Business Information', {
            'fields': ('user', 'business_name', 'license_no', 'contact_person')
        }),
        ('Location', {
            'fields': ('district', 'address')
        }),
        ('Status', {
            'fields': ('is_verified', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def user_email(self, obj):
        """Display user email with link."""
        return format_html(
            '<a href="/admin/accounts/user/{}/change/">{}</a>',
            obj.user.id, obj.user.email
        )
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'
    
    def district_name(self, obj):
        """Display district name with link."""
        if obj.district:
            return format_html(
                '<a href="/admin/districts/district/{}/change/">{}</a>',
                obj.district.id, obj.district.name
            )
        return '-'
    district_name.short_description = 'District'
    district_name.admin_order_field = 'district__name'
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request).select_related('user', 'district')
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter users to only show retailer role."""
        if db_field.name == "user":
            from apps.accounts.models import User
            kwargs["queryset"] = User.objects.filter(role='retailer')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
