from rest_framework import serializers
from .models import Complaint, ComplaintEvidence, ComplaintStatusHistory, ComplaintNotification
from apps.accounts.serializers import UserSerializer
from apps.districts.serializers import DistrictListSerializer
from apps.catalog.serializers import SKUListSerializer
from apps.retailers.serializers import RetailerListSerializer


class ComplaintEvidenceSerializer(serializers.ModelSerializer):
    """Serializer for complaint evidence files."""
    
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintEvidence
        fields = (
            'id', 'file', 'file_type', 'description', 'uploaded_by_name',
            'uploaded_at', 'file_url'
        )
        read_only_fields = ('id', 'uploaded_by', 'uploaded_at')
    
    def get_uploaded_by_name(self, obj):
        """Get uploader's full name."""
        return obj.uploaded_by.get_full_name()
    
    def get_file_url(self, obj):
        """Get file URL."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class ComplaintStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for complaint status history."""
    
    changed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintStatusHistory
        fields = (
            'id', 'old_status', 'new_status', 'changed_by_name',
            'notes', 'timestamp'
        )
    
    def get_changed_by_name(self, obj):
        """Get changer's full name."""
        return obj.changed_by.get_full_name()


class ComplaintNotificationSerializer(serializers.ModelSerializer):
    """Serializer for complaint notifications."""
    
    class Meta:
        model = ComplaintNotification
        fields = (
            'id', 'notification_type', 'title', 'message',
            'sent_via_email', 'sent_via_sms', 'sent_at', 'read_at'
        )


class ComplaintSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for Complaint model."""
    
    complainant = UserSerializer(read_only=True)
    district = DistrictListSerializer(read_only=True)
    sku = SKUListSerializer(read_only=True)
    reported_retailer = RetailerListSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    evidence_files = ComplaintEvidenceSerializer(many=True, read_only=True)
    status_history = ComplaintStatusHistorySerializer(many=True, read_only=True)
    notifications = ComplaintNotificationSerializer(many=True, read_only=True)
    
    # Computed fields
    is_resolved = serializers.ReadOnlyField()
    is_pending = serializers.ReadOnlyField()
    is_price_violation = serializers.ReadOnlyField()
    has_evidence = serializers.ReadOnlyField()
    
    class Meta:
        model = Complaint
        fields = (
            'id', 'complaint_type', 'title', 'description', 'complainant',
            'district', 'sku', 'reported_retailer', 'reported_price',
            'reference_price', 'price_difference', 'price_difference_percentage',
            'incident_location', 'incident_date', 'witness_details',
            'contact_number', 'status', 'priority', 'assigned_to',
            'investigation_notes', 'resolution_action', 'resolution_report',
            'resolution_notes', 'evidence_files', 'status_history',
            'notifications', 'is_resolved', 'is_pending', 'is_price_violation',
            'has_evidence', 'created_at', 'updated_at', 'resolved_at', 'closed_at'
        )
        read_only_fields = (
            'id', 'complainant', 'price_difference', 'price_difference_percentage',
            'created_at', 'updated_at', 'resolved_at', 'closed_at'
        )


class PriceViolationComplaintCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating price violation complaints."""
    
    class Meta:
        model = Complaint
        fields = (
            'title', 'description', 'district', 'sku', 'reported_retailer',
            'reported_price', 'incident_location', 'incident_date',
            'witness_details', 'contact_number', 'priority'
        )
    
    def create(self, validated_data):
        """Create price violation complaint for authenticated user."""
        validated_data['complainant'] = self.context['request'].user
        validated_data['complaint_type'] = 'price_violation'
        
        # Get reference price for the SKU and district
        sku = validated_data.get('sku')
        district = validated_data.get('district')
        
        if sku and district:
            from apps.pricing.models import ReferencePrice
            reference_price = ReferencePrice.objects.filter(
                sku=sku,
                district=district,
                is_active=True
            ).order_by('-effective_from').first()
            
            if not reference_price:
                # Try global reference price
                reference_price = ReferencePrice.objects.filter(
                    sku=sku,
                    district__isnull=True,
                    is_active=True
                ).order_by('-effective_from').first()
            
            if reference_price:
                validated_data['reference_price'] = reference_price.price
        
        return super().create(validated_data)


class ComplaintCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating general complaints."""
    
    class Meta:
        model = Complaint
        fields = (
            'complaint_type', 'title', 'description', 'district', 'sku',
            'reported_retailer', 'incident_location', 'incident_date',
            'witness_details', 'contact_number', 'priority'
        )
    
    def create(self, validated_data):
        """Create complaint for authenticated user."""
        validated_data['complainant'] = self.context['request'].user
        return super().create(validated_data)


class ComplaintListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for complaint lists."""
    
    complainant_name = serializers.SerializerMethodField()
    district_name = serializers.ReadOnlyField(source='district.name')
    sku_name = serializers.ReadOnlyField(source='sku.name')
    retailer_name = serializers.ReadOnlyField(source='reported_retailer.business_name')
    assigned_to_name = serializers.SerializerMethodField()
    evidence_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Complaint
        fields = (
            'id', 'complaint_type', 'title', 'complainant_name', 'district_name',
            'sku_name', 'retailer_name', 'status', 'priority', 'assigned_to_name',
            'evidence_count', 'reported_price', 'reference_price', 'price_difference',
            'created_at'
        )
    
    def get_complainant_name(self, obj):
        """Get complainant's full name."""
        return obj.complainant.get_full_name()
    
    def get_assigned_to_name(self, obj):
        """Get assigned user's full name."""
        return obj.assigned_to.get_full_name() if obj.assigned_to else None
    
    def get_evidence_count(self, obj):
        """Get number of evidence files."""
        return obj.evidence_files.count()


class ComplaintStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating complaint status."""
    
    notes = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Complaint
        fields = ('status', 'notes')
    
    def update(self, instance, validated_data):
        """Update complaint status and create history record."""
        old_status = instance.status
        new_status = validated_data.get('status')
        notes = validated_data.get('notes', '')
        
        # Update the complaint
        instance.status = new_status
        if new_status == 'resolved':
            from django.utils import timezone
            instance.resolved_at = timezone.now()
        elif new_status == 'closed':
            from django.utils import timezone
            instance.closed_at = timezone.now()
        
        instance.save()
        
        # Create status history record
        ComplaintStatusHistory.objects.create(
            complaint=instance,
            old_status=old_status,
            new_status=new_status,
            changed_by=self.context['request'].user,
            notes=notes
        )
        
        return instance


class ComplaintResolutionSerializer(serializers.ModelSerializer):
    """Serializer for complaint resolution."""
    
    class Meta:
        model = Complaint
        fields = (
            'resolution_action', 'resolution_report', 'resolution_notes'
        )
    
    def update(self, instance, validated_data):
        """Update complaint resolution details."""
        instance.resolution_action = validated_data.get('resolution_action', instance.resolution_action)
        instance.resolution_report = validated_data.get('resolution_report', instance.resolution_report)
        instance.resolution_notes = validated_data.get('resolution_notes', instance.resolution_notes)
        instance.status = 'resolved'
        from django.utils import timezone
        instance.resolved_at = timezone.now()
        instance.save()
        
        return instance
