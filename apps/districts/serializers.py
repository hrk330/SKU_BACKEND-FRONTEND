from rest_framework import serializers
from .models import District


class DistrictSerializer(serializers.ModelSerializer):
    """Serializer for District model."""
    
    full_path = serializers.ReadOnlyField()
    level = serializers.ReadOnlyField()
    children_count = serializers.SerializerMethodField()
    
    class Meta:
        model = District
        fields = (
            'id', 'name', 'code', 'parent', 'is_active', 
            'full_path', 'level', 'children_count', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_children_count(self, obj):
        """Get count of child districts."""
        return obj.children.count()
    
    def validate_code(self, value):
        """Validate district code uniqueness."""
        if self.instance and self.instance.code == value:
            return value
        
        if District.objects.filter(code=value).exists():
            raise serializers.ValidationError("District code already exists.")
        return value


class DistrictListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for district lists."""
    
    full_path = serializers.ReadOnlyField()
    level = serializers.ReadOnlyField()
    
    class Meta:
        model = District
        fields = ('id', 'name', 'code', 'parent', 'full_path', 'level', 'is_active')


class DistrictTreeSerializer(serializers.ModelSerializer):
    """Serializer for hierarchical district tree."""
    
    children = serializers.SerializerMethodField()
    level = serializers.ReadOnlyField()
    
    class Meta:
        model = District
        fields = ('id', 'name', 'code', 'level', 'children')
    
    def get_children(self, obj):
        """Get child districts recursively."""
        children = obj.children.filter(is_active=True)
        return DistrictTreeSerializer(children, many=True).data
