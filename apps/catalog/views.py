from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import SKU
from .serializers import SKUSerializer, SKUListSerializer
from apps.accounts.permissions import IsGovAdminOrDistrictOfficer


class SKUListView(generics.ListCreateAPIView):
    """View for listing and creating SKUs."""
    
    queryset = SKU.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]  # Allow all authenticated users to read SKUs
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['manufacturer', 'is_active']
    search_fields = ['code', 'name', 'manufacturer']
    ordering_fields = ['name', 'code', 'pack_size_kg', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return SKUListSerializer
        return SKUSerializer


class SKUDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for SKU detail operations."""
    
    queryset = SKU.objects.all()
    serializer_class = SKUSerializer
    permission_classes = [IsGovAdminOrDistrictOfficer]
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()
