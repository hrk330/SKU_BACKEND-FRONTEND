from rest_framework import serializers
from decimal import Decimal
from django.db import models
from .models import ReferencePrice, PublishedPrice, PriceAudit
from apps.catalog.serializers import SKUListSerializer
from apps.districts.serializers import DistrictListSerializer
from apps.retailers.serializers import RetailerListSerializer
from apps.accounts.serializers import UserSerializer


class ReferencePriceSerializer(serializers.ModelSerializer):
    """Serializer for ReferencePrice model."""
    
    sku = SKUListSerializer(read_only=True)
    district = DistrictListSerializer(read_only=True)
    district_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    scope = serializers.ReadOnlyField()
    is_global = serializers.ReadOnlyField()
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ReferencePrice
        fields = (
            'id', 'sku', 'district', 'district_id', 'price', 'scope', 'is_global',
            'effective_from', 'effective_until', 'is_active', 'created_by',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')
    
    def validate(self, attrs):
        """Validate reference price data."""
        # Handle district_id field
        district_id = attrs.pop('district_id', None)
        if district_id is not None:
            from apps.districts.models import District
            try:
                attrs['district'] = District.objects.get(id=district_id)
            except District.DoesNotExist:
                raise serializers.ValidationError("Invalid district ID.")
        
        # Check for overlapping effective periods
        sku = attrs.get('sku')
        district = attrs.get('district')
        effective_from = attrs.get('effective_from')
        effective_until = attrs.get('effective_until')
        
        if sku and effective_from:
            overlapping = ReferencePrice.objects.filter(
                sku=sku,
                district=district,
                is_active=True
            ).exclude(id=self.instance.id if self.instance else None)
            
            if effective_until:
                overlapping = overlapping.filter(
                    models.Q(effective_until__isnull=True) | 
                    models.Q(effective_until__gt=effective_from)
                ).filter(
                    models.Q(effective_from__lt=effective_until)
                )
            else:
                overlapping = overlapping.filter(
                    models.Q(effective_until__isnull=True) | 
                    models.Q(effective_until__gt=effective_from)
                )
            
            if overlapping.exists():
                raise serializers.ValidationError(
                    "Reference price period overlaps with existing active price."
                )
        
        return attrs


class PublishedPriceSerializer(serializers.ModelSerializer):
    """Serializer for PublishedPrice model."""
    
    sku = SKUListSerializer(read_only=True)
    retailer = RetailerListSerializer(read_only=True)
    district = serializers.SerializerMethodField()
    markup_percentage = serializers.ReadOnlyField()
    reference_price = serializers.SerializerMethodField()
    
    class Meta:
        model = PublishedPrice
        fields = (
            'id', 'sku', 'retailer', 'district', 'price', 'markup_percentage',
            'reference_price', 'effective_from', 'effective_until',
            'compliant', 'validation_reason', 'is_active',
            'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'retailer', 'compliant', 'validation_reason', 
            'created_at', 'updated_at'
        )
    
    def get_district(self, obj):
        """Get retailer's district."""
        if obj.retailer and obj.retailer.district:
            return DistrictListSerializer(obj.retailer.district).data
        return None
    
    def get_reference_price(self, obj):
        """Get applicable reference price."""
        ref_price = obj.get_reference_price()
        if ref_price:
            return {
                'id': ref_price.id,
                'price': str(ref_price.price),
                'scope': ref_price.scope,
                'effective_from': ref_price.effective_from
            }
        return None


class PublishedPriceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating published prices."""
    
    sku_id = serializers.IntegerField(write_only=True)
    district_id = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    effective_from = serializers.DateTimeField(required=False)
    effective_until = serializers.DateTimeField(required=False)
    
    class Meta:
        model = PublishedPrice
        fields = ('sku_id', 'district_id', 'price', 'effective_from', 'effective_until')
    
    def validate_district_id(self, value):
        """Validate district_id field."""
        # Handle empty string case
        if value == '' or value is None:
            return None
        
        # Convert string to integer if it's a valid number
        try:
            return int(value)
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid district ID.")
    
    def validate(self, attrs):
        """Validate published price data."""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"DEBUG: PublishedPriceCreateSerializer.validate called with attrs: {attrs}")
        
        # Handle sku_id field
        sku_id = attrs.pop('sku_id', None)
        logger.info(f"DEBUG: sku_id from attrs: {sku_id}")
        
        if sku_id is not None:
            from apps.catalog.models import SKU
            try:
                sku = SKU.objects.get(id=sku_id)
                attrs['sku'] = sku
                logger.info(f"DEBUG: Found SKU: {sku.name} (ID: {sku.id})")
            except SKU.DoesNotExist:
                logger.error(f"DEBUG: SKU with id {sku_id} not found")
                raise serializers.ValidationError("Invalid SKU ID.")
        else:
            logger.error("DEBUG: No sku_id provided in attrs")
            raise serializers.ValidationError("SKU ID is required.")
        
        # Handle district_id field (optional, for future use)
        # Note: We don't actually use this for now since district comes from retailer
        district_id = attrs.pop('district_id', None)
        logger.info(f"DEBUG: district_id from attrs: {district_id}")
        
        if district_id is not None:
            from apps.districts.models import District
            try:
                # Validate that the district exists, but don't store it in attrs
                district = District.objects.get(id=district_id)
                logger.info(f"DEBUG: Found district: {district.name} (ID: {district.id})")
            except District.DoesNotExist:
                logger.error(f"DEBUG: District with id {district_id} not found")
                raise serializers.ValidationError("Invalid district ID.")
        
        # Set default effective_from if not provided
        if not attrs.get('effective_from'):
            from django.utils import timezone
            attrs['effective_from'] = timezone.now()
            logger.info(f"DEBUG: Set default effective_from to: {attrs['effective_from']}")
        else:
            logger.info(f"DEBUG: effective_from provided: {attrs.get('effective_from')}")
        
        # Check for overlapping effective periods
        sku = attrs.get('sku')
        effective_from = attrs.get('effective_from')
        effective_until = attrs.get('effective_until')
        
        # Note: We'll check for overlapping periods in the create method
        # where we have access to the retailer profile
        
        logger.info(f"DEBUG: Final attrs after validation: {attrs}")
        return attrs
    
    def create(self, validated_data):
        """Create published price with validation and alert system."""
        from .services import validate_price, create_price_alert
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"DEBUG: PublishedPriceCreateSerializer.create called with validated_data: {validated_data}")
        
        # Check if user has a retailer profile
        try:
            retailer = self.context['request'].user.retailer_profile
            logger.info(f"DEBUG: Found retailer: {retailer.business_name} (ID: {retailer.id})")
        except Exception as e:
            logger.error(f"DEBUG: Error getting retailer profile: {e}")
            raise serializers.ValidationError(
                "You must have a retailer profile to publish prices. Please contact support."
            )
        
        sku = validated_data['sku']
        price = validated_data['price']
        effective_from = validated_data['effective_from']
        effective_until = validated_data.get('effective_until')
        # Use retailer's district since district_id is optional and mainly for future use
        district = retailer.district
        
        # Check for overlapping effective periods
        if sku and effective_from:
            overlapping = PublishedPrice.objects.filter(
                sku=sku,
                retailer=retailer,
                is_active=True
            )
            
            if effective_until:
                overlapping = overlapping.filter(
                    models.Q(effective_until__isnull=True) | 
                    models.Q(effective_until__gt=effective_from)
                ).filter(
                    models.Q(effective_from__lt=effective_until)
                )
            else:
                overlapping = overlapping.filter(
                    models.Q(effective_until__isnull=True) | 
                    models.Q(effective_until__gt=effective_from)
                )
            
            if overlapping.exists():
                logger.error("DEBUG: Overlapping price period detected")
                raise serializers.ValidationError(
                    "Published price period overlaps with existing active price."
                )
        
        # Get reference price
        from .models import ReferencePrice
        reference_price = None
        
        # First try district-specific reference price
        if district:
            reference_price = ReferencePrice.objects.filter(
                sku=sku,
                district=district,
                is_active=True,
                effective_from__lte=validated_data['effective_from']
            ).filter(
                models.Q(effective_until__isnull=True) | 
                models.Q(effective_until__gt=validated_data['effective_from'])
            ).order_by('-effective_from').first()
        
        # Fall back to global reference price
        if not reference_price:
            reference_price = ReferencePrice.objects.filter(
                sku=sku,
                district__isnull=True,
                is_active=True,
                effective_from__lte=validated_data['effective_from']
            ).filter(
                models.Q(effective_until__isnull=True) | 
                models.Q(effective_until__gt=validated_data['effective_from'])
            ).order_by('-effective_from').first()
        
        # If no reference price exists, this is a major violation
        if not reference_price:
            raise serializers.ValidationError(
                "No reference price set for this product. Please contact admin to set reference prices first."
            )
        
        # Calculate markup percentage
        markup_percentage = ((price - reference_price.price) / reference_price.price) * 100
        
        # Determine compliance and violation severity
        # Prices should be within a reasonable range: 0% to 5% markup
        # Negative markups (below reference price) are also non-compliant
        is_compliant = 0 <= markup_percentage <= 5
        violation_severity = 'none'
        
        if markup_percentage < 0:
            violation_severity = 'severe'  # Below reference price is severe violation
        elif markup_percentage <= 1:
            violation_severity = 'none'
        elif markup_percentage <= 3:
            violation_severity = 'minor'
        elif markup_percentage <= 5:
            violation_severity = 'moderate'
        elif markup_percentage <= 10:
            violation_severity = 'major'
        else:
            violation_severity = 'severe'
        
        # Create published price
        published_price = PublishedPrice.objects.create(
            sku=sku,
            retailer=retailer,
            price=price,
            effective_from=validated_data['effective_from'],
            effective_until=validated_data.get('effective_until'),
            compliant=is_compliant,
            validation_reason=f"Markup: {markup_percentage:.2f}% (Reference: ₹{reference_price.price})",
            violation_severity=violation_severity,
            admin_approval_required=violation_severity in ['major', 'severe'],
            is_auto_approved=violation_severity not in ['major', 'severe'],
            markup_percentage=round(markup_percentage, 2)
        )
        
        # Create alert if there's a violation
        if violation_severity != 'none':
            create_price_alert(
                retailer=retailer,
                published_price=published_price,
                reference_price=reference_price,
                markup_percentage=markup_percentage,
                violation_severity=violation_severity
            )
        
        return published_price


class PriceAuditSerializer(serializers.ModelSerializer):
    """Serializer for PriceAudit model."""
    
    sku = SKUListSerializer(read_only=True)
    district = DistrictListSerializer(read_only=True)
    retailer = RetailerListSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = PriceAudit
        fields = (
            'id', 'event_type', 'sku', 'district', 'retailer',
            'old_price', 'new_price', 'reference_price', 'markup_percentage',
            'compliant', 'reason', 'user', 'created_at'
        )
        read_only_fields = ('id', 'created_at')


class FarmerPriceQuerySerializer(serializers.Serializer):
    """Serializer for farmer price query response."""
    
    sku = SKUListSerializer()
    reference_price = serializers.CharField(allow_null=True)
    top_retailer_prices = serializers.ListField(
        child=serializers.DictField()
    )
