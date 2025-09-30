from django.contrib import admin
from django.utils.html import format_html
from django.contrib import messages
from django.shortcuts import render, redirect
from django.urls import path, reverse
from django.http import HttpResponseRedirect
from django.utils.safestring import mark_safe
from .models import District


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    """Admin interface for District model."""
    
    list_display = (
        'name', 'code', 'parent', 'level', 'is_active', 
        'deletion_status', 'created_at', 'updated_at'
    )
    list_filter = ('is_active', 'parent', 'created_at')
    search_fields = ('name', 'code')
    ordering = ('name',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'parent', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def level(self, obj):
        """Display district level with color coding."""
        level = obj.level
        if level == 0:
            color = 'green'
            label = 'State/Province'
        elif level == 1:
            color = 'blue'
            label = 'District'
        else:
            color = 'orange'
            label = f'Sub-district (Level {level})'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, label
        )
    level.short_description = 'Level'
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request).select_related('parent')
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter parent districts to avoid circular references."""
        if db_field.name == "parent":
            kwargs["queryset"] = District.objects.filter(is_active=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    def deletion_status(self, obj):
        """Display deletion status with color coding."""
        can_delete, reason, affected_objects = obj.can_be_deleted()
        
        if can_delete:
            if affected_objects:
                # Can delete but will affect other objects
                color = 'orange'
                icon = '⚠️'
                status = f"{icon} Safe to delete (will affect {sum(affected_objects.values())} objects)"
            else:
                # Can delete safely
                color = 'green'
                icon = '✅'
                status = f"{icon} Safe to delete"
        else:
            # Cannot delete
            color = 'red'
            icon = '❌'
            status = f"{icon} Cannot delete"
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, status
        )
    deletion_status.short_description = 'Deletion Status'
    
    def get_urls(self):
        """Add custom URLs for deletion functionality."""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:district_id>/delete-check/',
                self.admin_site.admin_view(self.delete_check_view),
                name='districts_district_delete_check'
            ),
            path(
                '<int:district_id>/safe-delete/',
                self.admin_site.admin_view(self.safe_delete_view),
                name='districts_district_safe_delete'
            ),
        ]
        return custom_urls + urls
    
    def delete_check_view(self, request, district_id):
        """View to check deletion dependencies."""
        try:
            district = District.objects.get(id=district_id)
        except District.DoesNotExist:
            messages.error(request, "District not found.")
            return redirect('admin:districts_district_changelist')
        
        summary = district.get_deletion_summary()
        
        context = {
            'title': f'Delete District: {district.name}',
            'district': district,
            'summary': summary,
            'opts': self.model._meta,
            'has_change_permission': self.has_change_permission(request),
            'has_delete_permission': self.has_delete_permission(request),
        }
        
        return render(request, 'admin/districts/district/delete_check.html', context)
    
    def safe_delete_view(self, request, district_id):
        """View to safely delete a district after confirmation."""
        try:
            district = District.objects.get(id=district_id)
        except District.DoesNotExist:
            messages.error(request, "District not found.")
            return redirect('admin:districts_district_changelist')
        
        can_delete, reason, affected_objects = district.can_be_deleted()
        
        if not can_delete:
            messages.error(request, f"Cannot delete district: {reason}")
            return redirect('admin:districts_district_changelist')
        
        # Perform the deletion
        district_name = district.name
        affected_count = sum(affected_objects.values()) if affected_objects else 0
        
        try:
            district.delete()
            if affected_count > 0:
                messages.success(
                    request, 
                    f"District '{district_name}' and {affected_count} related objects have been successfully deleted."
                )
            else:
                messages.success(request, f"District '{district_name}' has been successfully deleted.")
        except Exception as e:
            messages.error(request, f"Error deleting district: {str(e)}")
        
        return redirect('admin:districts_district_changelist')
    
    def response_change(self, request, obj):
        """Override to add custom delete button."""
        if '_delete_check' in request.POST:
            return HttpResponseRedirect(
                reverse('admin:districts_district_delete_check', args=[obj.pk])
            )
        return super().response_change(request, obj)
    
    def response_add(self, request, obj, post_url_continue=None):
        """Override to add custom delete button."""
        if '_delete_check' in request.POST:
            return HttpResponseRedirect(
                reverse('admin:districts_district_delete_check', args=[obj.pk])
            )
        return super().response_add(request, obj, post_url_continue)
