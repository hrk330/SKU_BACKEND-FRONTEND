from rest_framework import serializers
from .models import SKU


class SKUSerializer(serializers.ModelSerializer):
    """Serializer for SKU model."""
    
    display_name = serializers.ReadOnlyField()
    
    class Meta:
        model = SKU
        fields = (
            'id', 'code', 'name', 'manufacturer', 'pack_size_kg',
            'description', 'is_active', 'display_name', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def validate_code(self, value):
        """Validate SKU code uniqueness."""
        if self.instance and self.instance.code == value:
            return value
        
        if SKU.objects.filter(code=value).exists():
            raise serializers.ValidationError("SKU code already exists.")
        return value


class SKUListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for SKU lists."""
    
    display_name = serializers.ReadOnlyField()
    
    class Meta:
        model = SKU
        fields = ('id', 'code', 'name', 'manufacturer', 'pack_size_kg', 'display_name', 'is_active')
