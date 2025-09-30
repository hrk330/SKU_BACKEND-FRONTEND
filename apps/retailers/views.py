from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Retailer
from .serializers import RetailerSerializer, RetailerListSerializer, RetailerCreateSerializer
from apps.accounts.permissions import IsGovAdminOrDistrictOfficer, IsRetailer


class RetailerListView(generics.ListCreateAPIView):
    """View for listing and creating retailers."""
    
    queryset = Retailer.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]  # Allow all authenticated users to read retailers
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['district', 'is_verified', 'is_active']
    search_fields = ['business_name', 'license_no', 'user__email', 'contact_person']
    ordering_fields = ['business_name', 'license_no', 'created_at']
    ordering = ['business_name']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return RetailerListSerializer
        return RetailerSerializer


class RetailerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retailer detail operations."""
    
    queryset = Retailer.objects.all()
    serializer_class = RetailerSerializer
    permission_classes = [IsGovAdminOrDistrictOfficer]
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()


class RetailerProfileView(generics.RetrieveUpdateAPIView):
    """View for retailer's own profile management."""
    
    serializer_class = RetailerSerializer
    permission_classes = [IsRetailer]
    
    def get_object(self):
        """Get the retailer profile for the authenticated user."""
        try:
            return self.request.user.retailer_profile
        except Retailer.DoesNotExist:
            return None
    
    def get(self, request, *args, **kwargs):
        """Get retailer profile or return 404 if not found."""
        obj = self.get_object()
        if obj is None:
            return Response(
                {'error': 'Retailer profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        return self.retrieve(request, *args, **kwargs)
    
    def put(self, request, *args, **kwargs):
        """Update retailer profile or return 404 if not found."""
        obj = self.get_object()
        if obj is None:
            return Response(
                {'error': 'Retailer profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        return self.update(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        """Partially update retailer profile or return 404 if not found."""
        obj = self.get_object()
        if obj is None:
            return Response(
                {'error': 'Retailer profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        return self.partial_update(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsRetailer])
def create_retailer_profile(request):
    """Create retailer profile for authenticated user."""
    # Check if profile already exists
    if hasattr(request.user, 'retailer_profile'):
        return Response(
            {'error': 'Retailer profile already exists'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = RetailerCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        retailer = serializer.save()
        return Response(
            RetailerSerializer(retailer).data, 
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
