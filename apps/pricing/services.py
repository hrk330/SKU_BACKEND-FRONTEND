"""
Pricing validation and business logic services.
"""

from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db import models
from .models import ReferencePrice, PublishedPrice, PriceAudit
from apps.accounts.models import User


def validate_price(sku, district, price, retailer, user=None):
    """
    Validate a price against reference prices and markup rules.
    
    Args:
        sku: SKU instance
        district: District instance
        price: Decimal price to validate
        user: User instance (optional, for audit logging)
        retailer: Retailer instance (optional, for audit logging)
    
    Returns:
        dict: {
            'valid': bool,
            'allowed_max': Decimal,
            'reason': str or None,
            'reference_price': Decimal or None,
            'markup_percentage': Decimal or None
        }
    """
    # Get applicable reference price
    reference_price = get_applicable_reference_price(sku, district)
    
    if not reference_price:
        return {
            'valid': False,
            'allowed_max': None,
            'reason': 'No reference price found for this SKU and district',
            'reference_price': None,
            'markup_percentage': None
        }
    
    # Calculate allowed maximum price
    max_markup_pct = getattr(settings, 'PRICING_MAX_MARKUP_PCT', 0.10)
    allowed_max = reference_price.price * (1 + Decimal(str(max_markup_pct)))
    
    # Calculate markup percentage
    markup_pct = ((price - reference_price.price) / reference_price.price) * 100
    
    # Validate price
    is_valid = price <= allowed_max
    
    reason = None
    if not is_valid:
        reason = f"Price exceeds maximum allowed markup of {max_markup_pct * 100}%. " \
                f"Reference price: {reference_price.price}, " \
                f"Maximum allowed: {allowed_max}, " \
                f"Your price: {price}"
    else:
        reason = f"Price is compliant. Markup: {markup_pct:.2f}%"
    
    # Log audit event
    if user:
        log_price_validation(
            sku=sku,
            district=district,
            retailer=retailer,
            price=price,
            reference_price=reference_price.price,
            markup_percentage=markup_pct,
            compliant=is_valid,
            reason=reason,
            user=user
        )
    
    return {
        'valid': is_valid,
        'allowed_max': allowed_max,
        'reason': reason,
        'reference_price': reference_price.price,
        'markup_percentage': markup_pct
    }


def get_applicable_reference_price(sku, district):
    """
    Get the applicable reference price for a SKU and district.
    
    Priority:
    1. District-specific reference price
    2. Global reference price
    
    Args:
        sku: SKU instance
        district: District instance
    
    Returns:
        ReferencePrice instance or None
    """
    now = timezone.now()
    
    # First try district-specific reference price
    if district:
        district_ref = ReferencePrice.objects.filter(
            sku=sku,
            district=district,
            is_active=True,
            effective_from__lte=now
        ).filter(
            models.Q(effective_until__isnull=True) | models.Q(effective_until__gt=now)
        ).order_by('-effective_from').first()
        
        if district_ref:
            return district_ref
    
    # Fall back to global reference price
    global_ref = ReferencePrice.objects.filter(
        sku=sku,
        district__isnull=True,
        is_active=True,
        effective_from__lte=now
    ).filter(
        models.Q(effective_until__isnull=True) | models.Q(effective_until__gt=now)
    ).order_by('-effective_from').first()
    
    return global_ref


def log_price_validation(sku, district, retailer, price, reference_price, 
                        markup_percentage, compliant, reason, user):
    """
    Log price validation event to audit trail.
    
    Args:
        sku: SKU instance
        district: District instance
        retailer: Retailer instance
        price: Decimal price
        reference_price: Decimal reference price
        markup_percentage: Decimal markup percentage
        compliant: bool compliance status
        reason: str reason
        user: User instance
    """
    event_type = 'validation_success' if compliant else 'validation_failure'
    
    PriceAudit.objects.create(
        event_type=event_type,
        sku=sku,
        district=district,
        retailer=retailer,
        new_price=price,
        reference_price=reference_price,
        markup_percentage=markup_percentage,
        compliant=compliant,
        reason=reason,
        user=user
    )


def log_price_event(event_type, sku, district=None, retailer=None, 
                   old_price=None, new_price=None, reason="", user=None):
    """
    Log a general price-related event to audit trail.
    
    Args:
        event_type: str event type
        sku: SKU instance
        district: District instance (optional)
        retailer: Retailer instance (optional)
        old_price: Decimal old price (optional)
        new_price: Decimal new price (optional)
        reason: str reason
        user: User instance
    """
    PriceAudit.objects.create(
        event_type=event_type,
        sku=sku,
        district=district,
        retailer=retailer,
        old_price=old_price,
        new_price=new_price,
        reason=reason,
        user=user
    )


def create_price_alert(retailer, published_price, reference_price, markup_percentage, violation_severity):
    """
    Create a price alert for violations.
    
    Args:
        retailer: Retailer instance
        published_price: PublishedPrice instance
        reference_price: ReferencePrice instance
        markup_percentage: Decimal markup percentage
        violation_severity: str severity level
    """
    from .models import PriceAlert
    
    # Map violation severity to alert severity
    severity_mapping = {
        'minor': 'low',
        'moderate': 'medium',
        'major': 'high',
        'severe': 'critical'
    }
    
    alert_severity = severity_mapping.get(violation_severity, 'medium')
    
    # Create alert title and message
    if violation_severity == 'minor':
        title = f"Minor Price Deviation - {published_price.sku.name}"
        message = f"Retailer {retailer.business_name} set price {markup_percentage:.2f}% above reference price for {published_price.sku.name}. This is within acceptable limits but should be monitored."
    elif violation_severity == 'moderate':
        title = f"Moderate Price Deviation - {published_price.sku.name}"
        message = f"Retailer {retailer.business_name} set price {markup_percentage:.2f}% above reference price for {published_price.sku.name}. This exceeds recommended limits and requires attention."
    elif violation_severity == 'major':
        title = f"Major Price Violation - {published_price.sku.name}"
        message = f"Retailer {retailer.business_name} set price {markup_percentage:.2f}% above reference price for {published_price.sku.name}. This is a significant violation that requires immediate action."
    else:  # severe
        title = f"Severe Price Violation - {published_price.sku.name}"
        message = f"Retailer {retailer.business_name} set price {markup_percentage:.2f}% above reference price for {published_price.sku.name}. This is a severe violation that requires immediate intervention."
    
    # Create the alert
    PriceAlert.objects.create(
        retailer=retailer,
        published_price=published_price,
        reference_price=reference_price,
        alert_type='markup_violation',
        severity=alert_severity,
        title=title,
        message=message,
        markup_percentage=markup_percentage,
        reference_price_amount=reference_price.price,
        retailer_price_amount=published_price.price
    )


def get_farmer_price_data(sku, district):
    """
    Get price data for farmer query endpoint.
    
    Args:
        sku: SKU instance
        district: District instance
    
    Returns:
        dict: {
            'sku': dict,
            'reference_price': Decimal,
            'top_retailer_prices': list
        }
    """
    from django.core.cache import cache
    from apps.catalog.serializers import SKUListSerializer
    
    # Create cache key
    cache_key = f"farmer_prices_{sku.id}_{district.id}"
    
    # Try to get from cache
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    # Get reference price
    reference_price = get_applicable_reference_price(sku, district)
    ref_price = reference_price.price if reference_price else None
    
    # Get top retailer prices
    now = timezone.now()
    retailer_prices = PublishedPrice.objects.filter(
        sku=sku,
        retailer__district=district,
        is_active=True,
        compliant=True,
        effective_from__lte=now
    ).filter(
        models.Q(effective_until__isnull=True) | models.Q(effective_until__gt=now)
    ).select_related('retailer').order_by('price')[:3]
    
    # Prepare response data
    data = {
        'sku': SKUListSerializer(sku).data,
        'reference_price': str(ref_price) if ref_price else None,
        'top_retailer_prices': [
            {
                'retailer_name': price.retailer.business_name,
                'price': str(price.price),
                'effective_from': price.effective_from.isoformat()
            }
            for price in retailer_prices
        ]
    }
    
    # Cache for 60 seconds
    cache.set(cache_key, data, 60)
    
    return data
