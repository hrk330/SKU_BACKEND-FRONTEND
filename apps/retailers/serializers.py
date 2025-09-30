from rest_framework import serializers
from .models import Retailer
from apps.accounts.serializers import UserSerializer
from apps.districts.serializers import DistrictListSerializer


class RetailerSerializer(serializers.ModelSerializer):
    """Serializer for Retailer model."""
    
    user = UserSerializer(read_only=True)
    district = DistrictListSerializer(read_only=True)
    district_id = serializers.IntegerField(write_only=True)
    user_email = serializers.ReadOnlyField()
    user_phone = serializers.ReadOnlyField()
    district_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Retailer
        fields = (
            'id', 'user', 'license_no', 'business_name', 'district', 'district_id',
            'address', 'contact_person', 'is_verified', 'is_active',
            'user_email', 'user_phone', 'district_name',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'is_verified', 'created_at', 'updated_at')
    
    def validate_license_no(self, value):
        """Validate license number uniqueness."""
        if self.instance and self.instance.license_no == value:
            return value
        
        if Retailer.objects.filter(license_no=value).exists():
            raise serializers.ValidationError("License number already exists.")
        return value


class RetailerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for retailer lists."""
    
    user_email = serializers.ReadOnlyField()
    district_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Retailer
        fields = (
            'id', 'business_name', 'license_no', 'user_email', 
            'district_name', 'is_verified', 'is_active'
        )


class RetailerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating retailer profiles."""
    
    class Meta:
        model = Retailer
        fields = (
            'license_no', 'business_name', 'district', 'address', 'contact_person'
        )
    
    def validate_license_no(self, value):
        """Validate license number uniqueness."""
        if Retailer.objects.filter(license_no=value).exists():
            raise serializers.ValidationError("License number already exists.")
        return value
    
    def create(self, validated_data):
        """Create retailer profile for the authenticated user."""
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)
