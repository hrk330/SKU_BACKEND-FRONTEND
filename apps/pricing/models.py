"""
Pricing models for reference prices, published prices, and price audits.
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from apps.accounts.models import User
from apps.catalog.models import SKU
from apps.districts.models import District
from apps.retailers.models import Retailer


class ReferencePrice(models.Model):
    """
    Reference price model for government-set prices.
    
    These are the mandatory prices that retailers should follow.
    """
    
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        related_name='reference_prices',
        help_text="Product SKU"
    )
    district = models.ForeignKey(
        District,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reference_prices',
        help_text="District (null for global prices)"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Reference price"
    )
    effective_from = models.DateTimeField(
        help_text="When this price becomes effective"
    )
    effective_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this price expires (null for indefinite)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this price is active"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_reference_prices',
        help_text="User who created this price"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pricing_referenceprice'
        verbose_name = 'Reference Price'
        verbose_name_plural = 'Reference Prices'
        ordering = ['-effective_from']
        unique_together = ['sku', 'district', 'effective_from']
    
    def __str__(self):
        scope = self.district.name if self.district else 'Global'
        return f"{self.sku.name} - {scope} - ₹{self.price}"
    
    @property
    def scope(self):
        """Get price scope (district-specific or global)."""
        return self.district.name if self.district else 'Global'
    
    @property
    def is_global(self):
        """Check if this is a global price."""
        return self.district is None


class PublishedPrice(models.Model):
    """
    Published price model for retailer-set prices.
    
    Contains validation results and compliance status.
    """
    
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        related_name='published_prices',
        help_text="Product SKU"
    )
    retailer = models.ForeignKey(
        Retailer,
        on_delete=models.CASCADE,
        related_name='published_prices',
        help_text="Retailer who published this price"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Published price"
    )
    effective_from = models.DateTimeField(
        help_text="When this price becomes effective"
    )
    effective_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this price expires (null for indefinite)"
    )
    compliant = models.BooleanField(
        default=False,
        help_text="Whether this price is compliant with reference price"
    )
    validation_reason = models.TextField(
        blank=True,
        help_text="Reason for compliance status"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this price is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # New compliance fields
    violation_severity = models.CharField(
        max_length=20,
        choices=[
            ('none', 'No Violation'),
            ('minor', 'Minor Deviation (1-3%)'),
            ('moderate', 'Moderate Deviation (3-5%)'),
            ('major', 'Major Deviation (5-10%)'),
            ('severe', 'Severe Violation (>10%)')
        ],
        default='none',
        help_text="Severity of price violation"
    )
    admin_approval_required = models.BooleanField(
        default=False,
        help_text="Whether admin approval is required"
    )
    admin_notes = models.TextField(
        blank=True,
        help_text="Admin notes about this price"
    )
    is_auto_approved = models.BooleanField(
        default=False,
        help_text="Whether this price was auto-approved"
    )
    markup_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Markup percentage over reference price"
    )
    
    class Meta:
        db_table = 'pricing_publishedprice'
        verbose_name = 'Published Price'
        verbose_name_plural = 'Published Prices'
        ordering = ['-effective_from']
    
    def __str__(self):
        return f"{self.retailer.business_name} - {self.sku.name} - ₹{self.price}"
    
    def district(self):
        """Get retailer's district."""
        return self.retailer.district
    
    def get_reference_price(self):
        """Get applicable reference price (district-specific or global)."""
        # Get the retailer's district
        retailer_district = self.retailer.district
        
        # First try district-specific reference price
        if retailer_district:
            district_ref = ReferencePrice.objects.filter(
                sku=self.sku,
                district=retailer_district,
                is_active=True,
                effective_from__lte=self.effective_from
            ).filter(
                models.Q(effective_until__isnull=True) | 
                models.Q(effective_until__gt=self.effective_from)
            ).order_by('-effective_from').first()
            
            if district_ref:
                return district_ref
        
        # Fall back to global reference price
        global_ref = ReferencePrice.objects.filter(
            sku=self.sku,
            district__isnull=True,
            is_active=True,
            effective_from__lte=self.effective_from
        ).filter(
            models.Q(effective_until__isnull=True) | 
            models.Q(effective_until__gt=self.effective_from)
        ).order_by('-effective_from').first()
        
        return global_ref
    
    def calculate_markup_percentage(self):
        """Calculate markup percentage over reference price."""
        try:
            reference_price = self.get_reference_price()
            if reference_price and reference_price.price > 0:
                markup = ((self.price - reference_price.price) / reference_price.price) * 100
                return round(markup, 2)
        except Exception:
            # If there's any error calculating markup, return None
            pass
        return None
    
    def determine_violation_severity(self):
        """Determine violation severity based on markup percentage."""
        try:
            markup = self.calculate_markup_percentage()
            if markup is None:
                return 'none'
            
            if markup < 0:
                return 'severe'  # Below reference price is severe violation
            elif markup <= 1:
                return 'none'
            elif markup <= 3:
                return 'minor'
            elif markup <= 5:
                return 'moderate'
            elif markup <= 10:
                return 'major'
            else:
                return 'severe'
        except Exception:
            # If there's any error determining severity, return 'none'
            return 'none'
    
    def save(self, *args, **kwargs):
        """Override save to calculate markup and violation severity."""
        # Calculate markup percentage
        self.markup_percentage = self.calculate_markup_percentage()
        
        # Determine violation severity
        self.violation_severity = self.determine_violation_severity()
        
        # Update compliance status based on markup
        if self.markup_percentage is not None:
            # Prices should be within a reasonable range: 0% to 5% markup
            # Negative markups (below reference price) are also non-compliant
            self.compliant = 0 <= self.markup_percentage <= 5
        else:
            self.compliant = False  # If markup can't be calculated, mark as non-compliant
        
        # Set admin approval requirement based on severity
        if self.violation_severity in ['major', 'severe']:
            self.admin_approval_required = True
        else:
            self.admin_approval_required = False
            self.is_auto_approved = True
        
        super().save(*args, **kwargs)


class PriceAlert(models.Model):
    """
    Price alert model for tracking violations and notifications.
    """
    
    ALERT_TYPES = [
        ('markup_violation', 'Markup Violation'),
        ('price_change', 'Price Change'),
        ('reference_price_update', 'Reference Price Update'),
        ('compliance_breach', 'Compliance Breach'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    retailer = models.ForeignKey(
        Retailer,
        on_delete=models.CASCADE,
        related_name='price_alerts',
        help_text="Retailer involved in the alert"
    )
    published_price = models.ForeignKey(
        PublishedPrice,
        on_delete=models.CASCADE,
        related_name='alerts',
        null=True,
        blank=True,
        help_text="Published price that triggered the alert"
    )
    reference_price = models.ForeignKey(
        ReferencePrice,
        on_delete=models.CASCADE,
        related_name='alerts',
        null=True,
        blank=True,
        help_text="Reference price involved"
    )
    alert_type = models.CharField(
        max_length=50,
        choices=ALERT_TYPES,
        help_text="Type of alert"
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_LEVELS,
        help_text="Alert severity level"
    )
    title = models.CharField(
        max_length=200,
        help_text="Alert title"
    )
    message = models.TextField(
        help_text="Detailed alert message"
    )
    markup_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Markup percentage that triggered the alert"
    )
    reference_price_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Reference price amount"
    )
    retailer_price_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Retailer price amount"
    )
    is_resolved = models.BooleanField(
        default=False,
        help_text="Whether the alert has been resolved"
    )
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts',
        help_text="User who resolved the alert"
    )
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the alert was resolved"
    )
    resolution_notes = models.TextField(
        blank=True,
        help_text="Notes about how the alert was resolved"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pricing_pricealert'
        verbose_name = 'Price Alert'
        verbose_name_plural = 'Price Alerts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_severity_display()} - {self.title} - {self.retailer.business_name}"
    
    def resolve(self, user, notes=""):
        """Mark alert as resolved."""
        self.is_resolved = True
        self.resolved_by = user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()


class PriceAudit(models.Model):
    """
    Price audit model for tracking all price-related events.
    """
    
    EVENT_TYPES = [
        ('price_created', 'Price Created'),
        ('price_updated', 'Price Updated'),
        ('price_deleted', 'Price Deleted'),
        ('validation_success', 'Validation Success'),
        ('validation_failure', 'Validation Failure'),
        ('compliance_check', 'Compliance Check'),
    ]
    
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_TYPES,
        help_text="Type of audit event"
    )
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        related_name='price_audits',
        help_text="Product SKU"
    )
    district = models.ForeignKey(
        District,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='price_audits',
        help_text="District"
    )
    retailer = models.ForeignKey(
        Retailer,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='price_audits',
        help_text="Retailer"
    )
    old_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Previous price"
    )
    new_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="New price"
    )
    reference_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Reference price at time of event"
    )
    markup_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Markup percentage"
    )
    compliant = models.BooleanField(
        null=True,
        blank=True,
        help_text="Compliance status"
    )
    reason = models.TextField(
        blank=True,
        help_text="Reason for the event"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='price_audits',
        help_text="User who triggered the event"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'pricing_priceaudit'
        verbose_name = 'Price Audit'
        verbose_name_plural = 'Price Audits'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.sku.name} - {self.created_at}"