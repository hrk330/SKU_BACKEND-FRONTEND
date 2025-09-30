from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import ReferencePrice, PublishedPrice, PriceAudit, PriceAlert
from .serializers import (
    ReferencePriceSerializer, PublishedPriceSerializer, PublishedPriceCreateSerializer,
    PriceAuditSerializer, FarmerPriceQuerySerializer
)
from .services import get_farmer_price_data
from apps.accounts.permissions import IsGovAdmin, IsRetailer, IsFarmer


class ReferencePriceListView(generics.ListCreateAPIView):
    """View for listing and creating reference prices (Government Admin only)."""
    
    queryset = ReferencePrice.objects.filter(is_active=True)
    serializer_class = ReferencePriceSerializer
    permission_classes = [IsAuthenticated]  # Allow all authenticated users to read reference prices
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sku', 'district', 'is_active']
    search_fields = ['sku__name', 'sku__code', 'district__name']
    ordering_fields = ['price', 'effective_from', 'created_at']
    ordering = ['-effective_from']
    
    def perform_create(self, serializer):
        """Set created_by user."""
        serializer.save(created_by=self.request.user)


class ReferencePriceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for reference price detail operations."""
    
    queryset = ReferencePrice.objects.all()
    serializer_class = ReferencePriceSerializer
    permission_classes = [IsGovAdmin]
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()


class PublishedPriceListView(generics.ListCreateAPIView):
    """View for listing and creating published prices."""
    
    queryset = PublishedPrice.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sku', 'retailer', 'compliant', 'is_active']
    search_fields = ['sku__name', 'sku__code', 'retailer__business_name']
    ordering_fields = ['price', 'effective_from', 'created_at']
    ordering = ['-effective_from']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PublishedPriceSerializer
        return PublishedPriceCreateSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        queryset = super().get_queryset()
        
        # Retailers can only see their own prices
        if self.request.user.is_retailer:
            try:
                retailer = self.request.user.retailer_profile
                queryset = queryset.filter(retailer=retailer)
            except:
                queryset = queryset.none()
        
        return queryset.select_related('sku', 'retailer', 'retailer__district')
    
    def perform_create(self, serializer):
        """Create published price for authenticated retailer."""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"DEBUG: PublishedPriceListView.perform_create called")
        logger.info(f"DEBUG: Request data: {self.request.data}")
        logger.info(f"DEBUG: User: {self.request.user.email} (Role: {self.request.user.role})")
        
        if not self.request.user.is_retailer:
            logger.error("DEBUG: User is not a retailer")
            raise PermissionError("Only retailers can create published prices.")
        
        # Check if user has a retailer profile
        try:
            retailer = self.request.user.retailer_profile
            logger.info(f"DEBUG: Found retailer profile: {retailer.business_name}")
        except Exception as e:
            logger.error(f"DEBUG: Error getting retailer profile: {e}")
            raise PermissionError("You must have a retailer profile to publish prices. Please contact support.")
        
        # The serializer handles validation and creation
        logger.info("DEBUG: Calling serializer.save()")
        instance = serializer.save()
        logger.info("DEBUG: serializer.save() completed successfully")
        
        # Store the created instance for use in create method
        self._created_instance = instance
    
    def create(self, request, *args, **kwargs):
        """Override create to return full serializer response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Use the full serializer to return complete data
        full_serializer = PublishedPriceSerializer(self._created_instance, context={'request': request})
        headers = self.get_success_headers(full_serializer.data)
        return Response(full_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class PublishedPriceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for published price detail operations."""
    
    queryset = PublishedPrice.objects.all()
    serializer_class = PublishedPriceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        queryset = super().get_queryset()
        
        # Retailers can only see their own prices
        if self.request.user.is_retailer:
            try:
                retailer = self.request.user.retailer_profile
                queryset = queryset.filter(retailer=retailer)
            except:
                queryset = queryset.none()
        
        return queryset.select_related('sku', 'retailer', 'retailer__district')
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()


class PriceAuditListView(generics.ListAPIView):
    """View for listing price audit records (Government Admin only)."""
    
    queryset = PriceAudit.objects.all()
    serializer_class = PriceAuditSerializer
    permission_classes = [IsGovAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['event_type', 'sku', 'district', 'retailer', 'compliant']
    search_fields = ['sku__name', 'sku__code', 'retailer__business_name', 'reason']
    ordering_fields = ['created_at', 'new_price', 'markup_percentage']
    ordering = ['-created_at']


@api_view(['GET'])
@permission_classes([IsFarmer])
def farmer_price_query(request):
    """Farmer price query endpoint with caching."""
    sku_id = request.query_params.get('sku')
    district_id = request.query_params.get('district')
    
    if not sku_id or not district_id:
        return Response(
            {'error': 'Both sku and district parameters are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        from apps.catalog.models import SKU
        from apps.districts.models import District
        
        sku = SKU.objects.get(id=sku_id, is_active=True)
        district = District.objects.get(id=district_id, is_active=True)
        
        # Get price data (with caching)
        data = get_farmer_price_data(sku, district)
        
        serializer = FarmerPriceQuerySerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except SKU.DoesNotExist:
        return Response(
            {'error': 'SKU not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except District.DoesNotExist:
        return Response(
            {'error': 'District not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsGovAdmin])
def admin_dashboard_data(request):
    """
    Get comprehensive dashboard data for government admin.
    Includes price alerts, compliance statistics, and violation summaries.
    """
    from apps.retailers.models import Retailer
    from apps.catalog.models import SKU
    from apps.districts.models import District
    
    # Get recent price alerts (last 7 days)
    seven_days_ago = timezone.now() - timedelta(days=7)
    recent_alerts = PriceAlert.objects.filter(
        created_at__gte=seven_days_ago
    ).select_related('retailer', 'published_price', 'reference_price')
    
    # Get unresolved alerts
    unresolved_alerts = recent_alerts.filter(is_resolved=False)
    
    # Get compliance statistics
    total_published_prices = PublishedPrice.objects.filter(is_active=True).count()
    compliant_prices = PublishedPrice.objects.filter(is_active=True, compliant=True).count()
    non_compliant_prices = total_published_prices - compliant_prices
    
    # Get violation severity breakdown
    violation_stats = PublishedPrice.objects.filter(
        is_active=True,
        violation_severity__in=['minor', 'moderate', 'major', 'severe']
    ).values('violation_severity').annotate(count=Count('id'))
    
    # Get top violating retailers
    top_violators = Retailer.objects.filter(
        published_prices__violation_severity__in=['major', 'severe'],
        published_prices__is_active=True
    ).annotate(
        violation_count=Count('published_prices', filter=Q(
            published_prices__violation_severity__in=['major', 'severe'],
            published_prices__is_active=True
        ))
    ).order_by('-violation_count')[:5]
    
    # Get recent price changes (last 24 hours)
    one_day_ago = timezone.now() - timedelta(days=1)
    recent_price_changes = PublishedPrice.objects.filter(
        created_at__gte=one_day_ago
    ).select_related('retailer', 'sku').order_by('-created_at')[:10]
    
    # Get products without reference prices
    products_without_ref_prices = SKU.objects.filter(
        reference_prices__isnull=True
    ).count()
    
    # Get district-wise compliance
    district_compliance = District.objects.annotate(
        total_prices=Count('retailers__published_prices', filter=Q(
            retailers__published_prices__is_active=True
        )),
        compliant_prices=Count('retailers__published_prices', filter=Q(
            retailers__published_prices__is_active=True,
            retailers__published_prices__compliant=True
        ))
    ).filter(total_prices__gt=0)
    
    # Prepare response data
    dashboard_data = {
        'alerts': {
            'total_recent': recent_alerts.count(),
            'unresolved': unresolved_alerts.count(),
            'by_severity': {
                'critical': recent_alerts.filter(severity='critical').count(),
                'high': recent_alerts.filter(severity='high').count(),
                'medium': recent_alerts.filter(severity='medium').count(),
                'low': recent_alerts.filter(severity='low').count(),
            },
            'recent_alerts': [
                {
                    'id': alert.id,
                    'title': alert.title,
                    'severity': alert.severity,
                    'retailer_name': alert.retailer.business_name,
                    'markup_percentage': float(alert.markup_percentage) if alert.markup_percentage else None,
                    'created_at': alert.created_at.isoformat(),
                    'is_resolved': alert.is_resolved
                }
                for alert in unresolved_alerts[:10]
            ]
        },
        'compliance': {
            'total_prices': total_published_prices,
            'compliant_prices': compliant_prices,
            'non_compliant_prices': non_compliant_prices,
            'compliance_rate': round((compliant_prices / total_published_prices * 100), 2) if total_published_prices > 0 else 0,
            'violation_breakdown': {
                item['violation_severity']: item['count'] 
                for item in violation_stats
            }
        },
        'top_violators': [
            {
                'retailer_name': retailer.business_name,
                'district': retailer.district.name,
                'violation_count': retailer.violation_count
            }
            for retailer in top_violators
        ],
        'recent_activity': {
            'price_changes_24h': recent_price_changes.count(),
            'recent_changes': [
                {
                    'retailer_name': price.retailer.business_name,
                    'product_name': price.sku.name,
                    'price': float(price.price),
                    'markup_percentage': float(price.markup_percentage) if price.markup_percentage else None,
                    'violation_severity': price.violation_severity,
                    'created_at': price.created_at.isoformat()
                }
                for price in recent_price_changes
            ]
        },
        'system_health': {
            'products_without_ref_prices': products_without_ref_prices,
            'district_compliance': [
                {
                    'district_name': district.name,
                    'total_prices': district.total_prices,
                    'compliant_prices': district.compliant_prices,
                    'compliance_rate': round((district.compliant_prices / district.total_prices * 100), 2) if district.total_prices > 0 else 0
                }
                for district in district_compliance
            ]
        }
    }
    
    return Response(dashboard_data)
