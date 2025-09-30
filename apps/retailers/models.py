from django.db import models
from django.core.validators import MinLengthValidator
from apps.accounts.models import User
from apps.districts.models import District


class Retailer(models.Model):
    """
    Retailer profile model linked to User.
    
    Contains business-specific information for retailers.
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='retailer_profile',
        help_text="Associated user account"
    )
    license_no = models.CharField(
        max_length=50,
        unique=True,
        validators=[MinLengthValidator(5)],
        help_text="Business license number"
    )
    business_name = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(3)],
        help_text="Business/trade name"
    )
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name='retailers',
        help_text="Primary business district"
    )
    address = models.TextField(
        help_text="Business address"
    )
    contact_person = models.CharField(
        max_length=100,
        help_text="Primary contact person"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether the retailer is verified"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the retailer is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'retailers_retailer'
        verbose_name = 'Retailer'
        verbose_name_plural = 'Retailers'
        ordering = ['business_name']
    
    def __str__(self):
        return f"{self.business_name} ({self.license_no})"
    
    @property
    def user_email(self):
        """Get associated user's email."""
        return self.user.email
    
    @property
    def user_phone(self):
        """Get associated user's phone."""
        return self.user.phone
    
    @property
    def district_name(self):
        """Get district name."""
        return self.district.name if self.district else None
