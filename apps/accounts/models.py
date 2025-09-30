from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Custom User model with role-based access control.
    
    Roles:
    - gov_admin: Government administrator with full access
    - district_officer: District-level officer
    - retailer: Fertilizer retailer
    - farmer: End consumer
    - inspector: Price inspector
    """
    
    ROLE_CHOICES = [
        ('gov_admin', 'Government Admin'),
        ('district_officer', 'District Officer'),
        ('retailer', 'Retailer'),
        ('farmer', 'Farmer'),
        ('inspector', 'Inspector'),
    ]
    
    # Phone number validator
    phone_validator = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    
    email = models.EmailField(unique=True)
    phone = models.CharField(
        max_length=17,
        validators=[phone_validator],
        help_text="Phone number with country code"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='farmer'
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Override username field to use email
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'phone', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    @property
    def is_gov_admin(self):
        return self.role == 'gov_admin'
    
    @property
    def is_district_officer(self):
        return self.role == 'district_officer'
    
    @property
    def is_retailer(self):
        return self.role == 'retailer'
    
    @property
    def is_farmer(self):
        return self.role == 'farmer'
    
    @property
    def is_inspector(self):
        return self.role == 'inspector'
