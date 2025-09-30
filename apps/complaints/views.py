from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Complaint, ComplaintEvidence, ComplaintStatusHistory, ComplaintNotification
from .serializers import (
    ComplaintSerializer, ComplaintCreateSerializer, ComplaintListSerializer,
    PriceViolationComplaintCreateSerializer, ComplaintStatusUpdateSerializer,
    ComplaintResolutionSerializer, ComplaintEvidenceSerializer
)
from apps.accounts.permissions import IsGovAdminOrDistrictOfficer


class ComplaintListView(generics.ListCreateAPIView):
    """View for listing and creating complaints."""
    
    queryset = Complaint.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'district', 'sku', 'complaint_type']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ComplaintListSerializer
        return ComplaintCreateSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        queryset = super().get_queryset()
        
        # Non-government users can only see their own complaints
        if not (self.request.user.is_gov_admin or self.request.user.is_district_officer or self.request.user.is_inspector):
            queryset = queryset.filter(complainant=self.request.user)
        
        return queryset.select_related(
            'complainant', 'district', 'sku', 'reported_retailer', 'assigned_to'
        ).prefetch_related('evidence_files')


class PriceViolationComplaintCreateView(generics.CreateAPIView):
    """View for creating price violation complaints."""
    
    queryset = Complaint.objects.all()
    serializer_class = PriceViolationComplaintCreateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create price violation complaint."""
        complaint = serializer.save()
        
        # Create initial status history
        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            new_status='pending',
            changed_by=self.request.user,
            notes='Complaint created'
        )
        
        # Send notification to admin
        self._send_admin_notification(complaint)
    
    def _send_admin_notification(self, complaint):
        """Send notification to admin about new complaint."""
        from apps.accounts.models import User
        admins = User.objects.filter(role__in=['gov_admin', 'district_officer'])
        
        for admin in admins:
            ComplaintNotification.objects.create(
                complaint=complaint,
                recipient=admin,
                notification_type='status_change',
                title=f'New Price Violation Complaint',
                message=f'New price violation complaint filed by {complaint.complainant.get_full_name()}',
                sent_via_email=True
            )


class ComplaintDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for complaint detail operations."""
    
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        queryset = super().get_queryset()
        
        # Non-government users can only see their own complaints
        if not (self.request.user.is_gov_admin or self.request.user.is_district_officer or self.request.user.is_inspector):
            queryset = queryset.filter(complainant=self.request.user)
        
        return queryset.select_related(
            'complainant', 'district', 'sku', 'reported_retailer', 'assigned_to'
        ).prefetch_related('evidence_files', 'status_history', 'notifications')
    
    def perform_destroy(self, instance):
        """Only allow deletion of pending complaints by complainant."""
        if instance.status != 'pending' or instance.complainant != self.request.user:
            raise PermissionError("Cannot delete this complaint.")
        super().perform_destroy(instance)


class ComplaintStatusUpdateView(generics.UpdateAPIView):
    """View for updating complaint status."""
    
    queryset = Complaint.objects.all()
    serializer_class = ComplaintStatusUpdateSerializer
    permission_classes = [IsGovAdminOrDistrictOfficer]
    
    def perform_update(self, serializer):
        """Update complaint status and send notifications."""
        old_status = serializer.instance.status
        complaint = serializer.save()
        
        # Send notification to complainant
        self._send_status_notification(complaint, old_status)
    
    def _send_status_notification(self, complaint, old_status):
        """Send notification to complainant about status change."""
        ComplaintNotification.objects.create(
            complaint=complaint,
            recipient=complaint.complainant,
            notification_type='status_change',
            title=f'Complaint Status Updated',
            message=f'Your complaint status has been changed from {old_status} to {complaint.status}',
            sent_via_email=True
        )


class ComplaintResolutionView(generics.UpdateAPIView):
    """View for resolving complaints."""
    
    queryset = Complaint.objects.all()
    serializer_class = ComplaintResolutionSerializer
    permission_classes = [IsGovAdminOrDistrictOfficer]
    
    def perform_update(self, serializer):
        """Resolve complaint and send final report."""
        complaint = serializer.save()
        
        # Send resolution notification
        self._send_resolution_notification(complaint)
    
    def _send_resolution_notification(self, complaint):
        """Send resolution notification to complainant."""
        ComplaintNotification.objects.create(
            complaint=complaint,
            recipient=complaint.complainant,
            notification_type='resolution',
            title=f'Complaint Resolved',
            message=f'Your complaint has been resolved. Please check the resolution report.',
            sent_via_email=True
        )


class ComplaintEvidenceUploadView(generics.CreateAPIView):
    """View for uploading evidence files."""
    
    queryset = ComplaintEvidence.objects.all()
    serializer_class = ComplaintEvidenceSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def perform_create(self, serializer):
        """Upload evidence file."""
        complaint_id = self.kwargs.get('complaint_id')
        complaint = get_object_or_404(Complaint, id=complaint_id)
        
        # Debug logging
        print(f"Uploading evidence for complaint {complaint_id}")
        print(f"Complaint complainant: {complaint.complainant}")
        print(f"Request user: {self.request.user}")
        print(f"User role: {self.request.user.role}")
        
        # Check if user can upload evidence (complainant or assigned staff)
        if not (complaint.complainant == self.request.user or 
                complaint.assigned_to == self.request.user or
                self.request.user.is_gov_admin or
                self.request.user.is_district_officer or
                self.request.user.is_inspector):
            print("Permission denied for evidence upload")
            raise PermissionError("You don't have permission to upload evidence for this complaint.")
        
        print("Permission granted, saving evidence")
        serializer.save(
            complaint=complaint,
            uploaded_by=self.request.user
        )


class MyComplaintsView(generics.ListAPIView):
    """View for user's own complaints."""
    
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'complaint_type']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get user's own complaints."""
        return Complaint.objects.filter(
            complainant=self.request.user
        ).select_related(
            'district', 'sku', 'reported_retailer', 'assigned_to'
        ).prefetch_related('evidence_files', 'status_history', 'notifications')


class AdminComplaintManagementView(generics.ListAPIView):
    """View for admin complaint management."""
    
    queryset = Complaint.objects.all()
    serializer_class = ComplaintListSerializer
    permission_classes = [IsGovAdminOrDistrictOfficer]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'district', 'sku', 'complaint_type', 'assigned_to']
    search_fields = ['title', 'description', 'complainant__first_name', 'complainant__last_name']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get all complaints for admin management."""
        return Complaint.objects.select_related(
            'complainant', 'district', 'sku', 'reported_retailer', 'assigned_to'
        ).prefetch_related('evidence_files')


@api_view(['POST'])
@permission_classes([IsGovAdminOrDistrictOfficer])
def assign_complaint(request, complaint_id):
    """Assign complaint to a government staff member."""
    try:
        complaint = Complaint.objects.get(id=complaint_id)
        assigned_to_id = request.data.get('assigned_to')
        
        if assigned_to_id:
            from apps.accounts.models import User
            assigned_user = User.objects.get(id=assigned_to_id)
            
            # Verify user is government staff
            if not (assigned_user.is_gov_admin or assigned_user.is_district_officer or assigned_user.is_inspector):
                return Response(
                    {'error': 'Can only assign to government staff'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            old_status = complaint.status
            complaint.assigned_to = assigned_user
            complaint.status = 'under_review'
            complaint.save()
            
            # Create status history
            ComplaintStatusHistory.objects.create(
                complaint=complaint,
                old_status=old_status,
                new_status='under_review',
                changed_by=request.user,
                notes=f'Complaint assigned to {assigned_user.get_full_name()}'
            )
            
            # Send notification to assigned user
            ComplaintNotification.objects.create(
                complaint=complaint,
                recipient=assigned_user,
                notification_type='assignment',
                title=f'Complaint Assigned',
                message=f'You have been assigned to handle complaint: {complaint.title}',
                sent_via_email=True
            )
            
            return Response(
                {'message': 'Complaint assigned successfully'}, 
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': 'assigned_to field is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Complaint.DoesNotExist:
        return Response(
            {'error': 'Complaint not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except User.DoesNotExist:
        return Response(
            {'error': 'Assigned user not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaint_statistics(request):
    """Get complaint statistics for dashboard."""
    user = request.user
    
    if user.is_gov_admin or user.is_district_officer or user.is_inspector:
        # Admin statistics
        total_complaints = Complaint.objects.count()
        pending_complaints = Complaint.objects.filter(status='pending').count()
        under_review = Complaint.objects.filter(status='under_review').count()
        resolved_complaints = Complaint.objects.filter(status='resolved').count()
        price_violations = Complaint.objects.filter(complaint_type='price_violation').count()
    else:
        # User statistics
        user_complaints = Complaint.objects.filter(complainant=user)
        total_complaints = user_complaints.count()
        pending_complaints = user_complaints.filter(status='pending').count()
        under_review = user_complaints.filter(status='under_review').count()
        resolved_complaints = user_complaints.filter(status='resolved').count()
        price_violations = user_complaints.filter(complaint_type='price_violation').count()
    
    return Response({
        'total_complaints': total_complaints,
        'pending_complaints': pending_complaints,
        'under_review': under_review,
        'resolved_complaints': resolved_complaints,
        'price_violations': price_violations,
    })
