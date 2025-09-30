from django.db import models
from django.core.validators import MinLengthValidator


class District(models.Model):
    """
    District model for hierarchical geographical organization.
    
    Supports parent-child relationships for states/provinces -> districts -> sub-districts.
    """
    
    name = models.CharField(
        max_length=100,
        validators=[MinLengthValidator(2)],
        help_text="District name"
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        help_text="Parent district (for sub-districts)"
    )
    code = models.CharField(
        max_length=10,
        unique=True,
        help_text="Unique district code"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'districts_district'
        verbose_name = 'District'
        verbose_name_plural = 'Districts'
        ordering = ['name']
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} - {self.name}"
        return self.name
    
    @property
    def full_path(self):
        """Return the full hierarchical path of the district."""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name
    
    @property
    def level(self):
        """Return the hierarchical level of the district."""
        level = 0
        current = self.parent
        while current:
            level += 1
            current = current.parent
        return level
    
    def get_ancestors(self):
        """Get all ancestor districts."""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors
    
    def get_descendants(self):
        """Get all descendant districts."""
        descendants = []
        for child in self.children.all():
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants
    
    def can_be_deleted(self):
        """
        Check if this district can be safely deleted.
        Returns (can_delete: bool, reason: str, affected_objects: dict)
        """
        from apps.retailers.models import Retailer
        from apps.pricing.models import ReferencePrice, PriceAudit
        from apps.complaints.models import Complaint
        
        affected_objects = {}
        reasons = []
        
        # Check for retailers (PROTECT relationship)
        retailers = Retailer.objects.filter(district=self)
        if retailers.exists():
            affected_objects['retailers'] = retailers.count()
            reasons.append(f"{retailers.count()} retailer(s) are located in this district")
        
        # Check for child districts
        children = self.children.all()
        if children.exists():
            affected_objects['child_districts'] = children.count()
            reasons.append(f"{children.count()} child district(s) will be deleted")
        
        # Check for reference prices (CASCADE - will be deleted)
        reference_prices = ReferencePrice.objects.filter(district=self)
        if reference_prices.exists():
            affected_objects['reference_prices'] = reference_prices.count()
            reasons.append(f"{reference_prices.count()} reference price(s) will be deleted")
        
        # Check for complaints (CASCADE - will be deleted)
        complaints = Complaint.objects.filter(district=self)
        if complaints.exists():
            affected_objects['complaints'] = complaints.count()
            reasons.append(f"{complaints.count()} complaint(s) will be deleted")
        
        # Check for price audits (CASCADE - will be deleted)
        price_audits = PriceAudit.objects.filter(district=self)
        if price_audits.exists():
            affected_objects['price_audits'] = price_audits.count()
            reasons.append(f"{price_audits.count()} price audit(s) will be deleted")
        
        # Can't delete if there are retailers (PROTECT relationship)
        can_delete = not retailers.exists()
        
        reason = "; ".join(reasons) if reasons else "No dependencies found"
        
        return can_delete, reason, affected_objects
    
    def get_deletion_summary(self):
        """
        Get a detailed summary of what will be affected by deletion.
        """
        can_delete, reason, affected_objects = self.can_be_deleted()
        
        summary = {
            'can_delete': can_delete,
            'reason': reason,
            'affected_objects': affected_objects,
            'district_info': {
                'name': self.name,
                'code': self.code,
                'full_path': self.full_path,
                'level': self.level,
                'children_count': self.children.count()
            }
        }
        
        return summary