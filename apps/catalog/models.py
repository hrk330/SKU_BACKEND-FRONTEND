from django.db import models
from django.core.validators import MinValueValidator, MinLengthValidator
from decimal import Decimal


class SKU(models.Model):
    """
    Stock Keeping Unit model for fertilizer products.
    
    Represents individual fertilizer products with their specifications.
    """
    
    code = models.CharField(
        max_length=20,
        unique=True,
        validators=[MinLengthValidator(3)],
        help_text="Unique SKU code"
    )
    name = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(3)],
        help_text="Product name"
    )
    manufacturer = models.CharField(
        max_length=100,
        validators=[MinLengthValidator(2)],
        help_text="Manufacturer name"
    )
    pack_size_kg = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Pack size in kilograms"
    )
    description = models.TextField(
        blank=True,
        help_text="Product description"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the SKU is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'catalog_sku'
        verbose_name = 'SKU'
        verbose_name_plural = 'SKUs'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code}) - {self.pack_size_kg}kg"
    
    @property
    def display_name(self):
        """Return formatted display name."""
        return f"{self.name} - {self.manufacturer} ({self.pack_size_kg}kg)"
    
    def get_price_per_kg(self, price):
        """Calculate price per kilogram."""
        if self.pack_size_kg > 0:
            return price / self.pack_size_kg
        return Decimal('0.00')
