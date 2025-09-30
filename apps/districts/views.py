from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import District
from .serializers import DistrictSerializer, DistrictListSerializer, DistrictTreeSerializer
from apps.accounts.permissions import IsGovAdminOrDistrictOfficer


class DistrictListView(generics.ListCreateAPIView):
    """View for listing and creating districts."""
    
    queryset = District.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]  # Allow all authenticated users to read districts
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['parent', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DistrictListSerializer
        return DistrictSerializer


class DistrictDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for district detail operations."""
    
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [IsGovAdminOrDistrictOfficer]
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def district_tree_view(request):
    """Get hierarchical district tree."""
    root_districts = District.objects.filter(
        parent__isnull=True, 
        is_active=True
    ).prefetch_related('children')
    
    serializer = DistrictTreeSerializer(root_districts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def district_children_view(request, district_id):
    """Get children of a specific district."""
    try:
        district = District.objects.get(id=district_id, is_active=True)
        children = district.children.filter(is_active=True)
        serializer = DistrictListSerializer(children, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except District.DoesNotExist:
        return Response(
            {'error': 'District not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
