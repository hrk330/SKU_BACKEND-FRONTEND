from django.contrib import admin
from django.utils.html import format_html
from .models import Complaint, ComplaintEvidence, ComplaintStatusHistory, ComplaintNotification
from apps.accounts.models import User


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    """Admin interface for enhanced Complaint model."""
    
    list_display = [
        'title', 'complainant', 'complaint_type', 'status', 'priority',
        'district', 'reported_retailer', 'created_at'
    ]
    list_filter = [
        'complaint_type', 'status', 'priority', 'district', 'created_at'
    ]
    search_fields = [
        'title', 'description', 'complainant__first_name', 'complainant__last_name',
        'complainant__email', 'reported_retailer__business_name'
    ]
    readonly_fields = [
        'price_difference', 'price_difference_percentage', 'created_at', 'updated_at'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('complaint_type', 'title', 'description', 'complainant', 'district')
        }),
        ('Product & Retailer', {
            'fields': ('sku', 'reported_retailer')
        }),
        ('Price Information', {
            'fields': ('reported_price', 'reference_price', 'price_difference', 'price_difference_percentage')
        }),
        ('Incident Details', {
            'fields': ('incident_location', 'incident_date', 'witness_details', 'contact_number')
        }),
        ('Status & Assignment', {
            'fields': ('status', 'priority', 'assigned_to')
        }),
        ('Investigation & Resolution', {
            'fields': ('investigation_notes', 'resolution_action', 'resolution_report', 'resolution_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'resolved_at', 'closed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request).select_related(
            'complainant', 'district', 'sku', 'reported_retailer', 'assigned_to'
        )
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter assigned_to to only show government staff."""
        if db_field.name == "assigned_to":
            # Only show users with government roles for assignment
            kwargs["queryset"] = User.objects.filter(
                role__in=['gov_admin', 'district_officer', 'inspector']
            ).order_by('first_name', 'last_name')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ComplaintEvidence)
class ComplaintEvidenceAdmin(admin.ModelAdmin):
    list_display = [
        'complaint', 'file_type', 'uploaded_by', 'uploaded_at'
    ]
    list_filter = ['file_type', 'uploaded_at']
    search_fields = [
        'complaint__title', 'uploaded_by__first_name', 'uploaded_by__last_name'
    ]
    readonly_fields = ['uploaded_at']


@admin.register(ComplaintStatusHistory)
class ComplaintStatusHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'complaint', 'old_status', 'new_status', 'changed_by', 'timestamp'
    ]
    list_filter = ['old_status', 'new_status', 'timestamp']
    search_fields = [
        'complaint__title', 'changed_by__first_name', 'changed_by__last_name'
    ]
    readonly_fields = ['timestamp']


@admin.register(ComplaintNotification)
class ComplaintNotificationAdmin(admin.ModelAdmin):
    list_display = [
        'complaint', 'recipient', 'notification_type', 'title', 'sent_at', 'read_at'
    ]
    list_filter = ['notification_type', 'sent_via_email', 'sent_via_sms', 'sent_at']
    search_fields = [
        'complaint__title', 'recipient__first_name', 'recipient__last_name', 'title'
    ]
    readonly_fields = ['sent_at']
