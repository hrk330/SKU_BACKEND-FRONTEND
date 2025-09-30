from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Q
from .models import ReferencePrice, PublishedPrice, PriceAudit, PriceAlert


@admin.register(ReferencePrice)
class ReferencePriceAdmin(admin.ModelAdmin):
    """Admin interface for ReferencePrice model."""
    
    list_display = (
        'sku', 'scope', 'price', 'effective_from', 'effective_until',
        'is_active', 'created_by', 'created_at'
    )
    list_filter = ('is_active', 'sku', 'district', 'created_at', 'effective_from')
    search_fields = ('sku__name', 'sku__code', 'district__name')
    ordering = ('-effective_from',)
    
    fieldsets = (
        ('Price Information', {
            'fields': ('sku', 'district', 'price', 'effective_from', 'effective_until')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def scope(self, obj):
        """Display scope with color coding."""
        if obj.is_global:
            color = 'blue'
            label = 'Global'
        else:
            color = 'green'
            label = obj.district.name
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, label
        )
    scope.short_description = 'Scope'
    scope.admin_order_field = 'district__name'
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request).select_related('sku', 'district', 'created_by')
    
    def save_model(self, request, obj, form, change):
        """Set created_by user."""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(PublishedPrice)
class PublishedPriceAdmin(admin.ModelAdmin):
    """Admin interface for PublishedPrice model."""
    
    list_display = (
        'sku', 'retailer', 'district', 'price', 'markup_percentage_display',
        'violation_severity_display', 'compliant', 'admin_approval_required',
        'effective_from', 'is_active', 'created_at'
    )
    list_filter = (
        'compliant', 'is_active', 'violation_severity', 'admin_approval_required',
        'sku', 'retailer__district', 'created_at', 'effective_from'
    )
    search_fields = (
        'sku__name', 'sku__code', 'retailer__business_name', 
        'retailer__license_no'
    )
    ordering = ('-effective_from',)
    
    fieldsets = (
        ('Price Information', {
            'fields': ('sku', 'retailer', 'price', 'effective_from', 'effective_until')
        }),
        ('Validation', {
            'fields': ('compliant', 'validation_reason')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'markup_percentage_display', 'violation_severity_display')
    
    def district(self, obj):
        """Display retailer's district."""
        return obj.retailer.district.name
    district.short_description = 'District'
    district.admin_order_field = 'retailer__district__name'
    
    def markup_percentage_display(self, obj):
        """Display markup percentage with color coding."""
        try:
            markup = obj.markup_percentage
            if markup is None:
                return '-'
            
            # Ensure we have a numeric value
            if hasattr(markup, '__float__'):
                markup_float = float(markup)
            else:
                # If it's a string, try to convert it
                markup_float = float(str(markup))
            
            markup_str = f"{markup_float:.2f}"
            
            if markup_float <= 10:
                color = 'green'
            elif markup_float <= 15:
                color = 'orange'
            else:
                color = 'red'
            
            # Use mark_safe instead of format_html to avoid SafeString issues
            html = f'<span style="color: {color}; font-weight: bold;">{markup_str}%</span>'
            return mark_safe(html)
        except (ValueError, TypeError, AttributeError) as e:
            # Fallback to simple display if there's any error
            return f"Error: {str(e)}"
    markup_percentage_display.short_description = 'Markup %'

    def violation_severity_display(self, obj):
        """Display violation severity with color coding."""
        severity_colors = {
            'none': 'green',
            'minor': 'orange',
            'moderate': 'orange',
            'major': 'red',
            'severe': 'darkred'
        }
        
        color = severity_colors.get(obj.violation_severity, 'black')
        severity_text = obj.get_violation_severity_display()
        
        return mark_safe(f'<span style="color: {color}; font-weight: bold;">{severity_text}</span>')
    violation_severity_display.short_description = 'Violation Severity'
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request).select_related(
            'sku', 'retailer', 'retailer__district'
        )
    
    actions = ['export_csv', 'mark_compliant', 'mark_non_compliant']
    
    def export_csv(self, request, queryset):
        """Export selected published prices to CSV."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="published_prices.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'SKU', 'Retailer', 'District', 'Price', 'Markup %', 
            'Compliant', 'Effective From', 'Created At'
        ])
        
        for price in queryset:
            markup = price.markup_percentage
            markup_str = f"{markup:.2f}%" if markup is not None else '-'
            writer.writerow([
                price.sku.name,
                price.retailer.business_name,
                price.retailer.district.name,
                price.price,
                markup_str,
                'Yes' if price.compliant else 'No',
                price.effective_from.strftime('%Y-%m-%d %H:%M'),
                price.created_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response
    export_csv.short_description = "Export selected prices to CSV"
    
    def mark_compliant(self, request, queryset):
        """Mark selected prices as compliant."""
        updated = queryset.update(compliant=True)
        self.message_user(request, f"{updated} prices marked as compliant.")
    mark_compliant.short_description = "Mark as compliant"
    
    def mark_non_compliant(self, request, queryset):
        """Mark selected prices as non-compliant."""
        updated = queryset.update(compliant=False)
        self.message_user(request, f"{updated} prices marked as non-compliant.")
    mark_non_compliant.short_description = "Mark as non-compliant"


@admin.register(PriceAlert)
class PriceAlertAdmin(admin.ModelAdmin):
    """Admin interface for PriceAlert model."""
    
    list_display = (
        'title', 'retailer', 'alert_type', 'severity_display', 'markup_percentage',
        'is_resolved', 'created_at'
    )
    list_filter = (
        'alert_type', 'severity', 'is_resolved', 'retailer__district', 'created_at'
    )
    search_fields = (
        'title', 'message', 'retailer__business_name', 'retailer__license_no'
    )
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Alert Information', {
            'fields': ('title', 'message', 'alert_type', 'severity')
        }),
        ('Price Details', {
            'fields': ('retailer', 'published_price', 'reference_price', 
                      'markup_percentage', 'reference_price_amount', 'retailer_price_amount')
        }),
        ('Resolution', {
            'fields': ('is_resolved', 'resolved_by', 'resolved_at', 'resolution_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def severity_display(self, obj):
        """Display severity with color coding."""
        severity_colors = {
            'low': 'green',
            'medium': 'orange',
            'high': 'red',
            'critical': 'darkred'
        }
        
        color = severity_colors.get(obj.severity, 'black')
        severity_text = obj.get_severity_display()
        
        return mark_safe(f'<span style="color: {color}; font-weight: bold;">{severity_text}</span>')
    severity_display.short_description = 'Severity'
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request).select_related(
            'retailer', 'published_price', 'reference_price', 'resolved_by'
        )
    
    actions = ['mark_as_resolved']
    
    def mark_as_resolved(self, request, queryset):
        """Mark selected alerts as resolved."""
        from django.utils import timezone
        
        updated = queryset.update(
            is_resolved=True,
            resolved_by=request.user,
            resolved_at=timezone.now()
        )
        self.message_user(request, f'{updated} alerts marked as resolved.')
    mark_as_resolved.short_description = "Mark selected alerts as resolved"


@admin.register(PriceAudit)
class PriceAuditAdmin(admin.ModelAdmin):
    """Admin interface for PriceAudit model."""
    
    list_display = (
        'event_type', 'sku', 'district', 'retailer', 'new_price',
        'reference_price', 'markup_percentage', 'compliant', 'user', 'created_at'
    )
    list_filter = (
        'event_type', 'compliant', 'sku', 'district', 'created_at'
    )
    search_fields = (
        'sku__name', 'sku__code', 'retailer__business_name', 
        'user__email', 'reason'
    )
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Event Information', {
            'fields': ('event_type', 'sku', 'district', 'retailer', 'user')
        }),
        ('Price Information', {
            'fields': ('old_price', 'new_price', 'reference_price', 'markup_percentage')
        }),
        ('Validation', {
            'fields': ('compliant', 'reason')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        """Optimize queryset for admin list view."""
        return super().get_queryset(request).select_related(
            'sku', 'district', 'retailer', 'user'
        )
    
    def has_add_permission(self, request):
        """Disable manual creation of audit records."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable editing of audit records."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Disable deletion of audit records."""
        return False
