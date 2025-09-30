"""
Tests for pricing validation service.
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User
from apps.districts.models import District
from apps.catalog.models import SKU
from apps.retailers.models import Retailer
from apps.pricing.models import ReferencePrice
from apps.pricing.services import validate_price


class PricingValidationTestCase(TestCase):
    """Test cases for price validation service."""
    
    def setUp(self):
        """Set up test data."""
        # Create test district
        self.district = District.objects.create(
            name='Test District',
            code='TD001',
            is_active=True
        )
        
        # Create test SKU
        self.sku = SKU.objects.create(
            code='TEST001',
            name='Test Fertilizer',
            manufacturer='Test Corp',
            pack_size_kg=Decimal('50.00'),
            is_active=True
        )
        
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            phone='+1234567890',
            role='gov_admin'
        )
        
        # Create test retailer
        self.retailer_user = User.objects.create_user(
            username='retailer',
            email='retailer@example.com',
            password='testpass123',
            phone='+1234567891',
            role='retailer'
        )
        
        self.retailer = Retailer.objects.create(
            user=self.retailer_user,
            license_no='LIC001',
            business_name='Test Retail Store',
            district=self.district,
            address='123 Test Street',
            contact_person='Test Retailer',
            is_verified=True
        )
        
        # Create reference price
        self.reference_price = ReferencePrice.objects.create(
            sku=self.sku,
            district=None,  # Global reference price
            price=Decimal('1000.00'),
            effective_from=timezone.now(),
            is_active=True,
            created_by=self.user
        )
    
    def test_valid_price_within_markup(self):
        """Test that price within allowed markup is valid."""
        price = Decimal('1050.00')  # 5% markup
        
        result = validate_price(
            sku=self.sku,
            district=self.district,
            price=price,
            retailer=self.retailer,
            user=self.user
        )
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['reference_price'], Decimal('1000.00'))
        self.assertAlmostEqual(float(result['markup_percentage']), 5.0, places=1)
        self.assertIn('compliant', result['reason'].lower())
    
    def test_invalid_price_exceeds_markup(self):
        """Test that price exceeding allowed markup is invalid."""
        price = Decimal('1200.00')  # 20% markup (exceeds 10% limit)
        
        result = validate_price(
            sku=self.sku,
            district=self.district,
            price=price,
            retailer=self.retailer,
            user=self.user
        )
        
        self.assertFalse(result['valid'])
        self.assertEqual(result['reference_price'], Decimal('1000.00'))
        self.assertAlmostEqual(float(result['markup_percentage']), 20.0, places=1)
        self.assertIn('exceeds maximum allowed markup', result['reason'])
    
    def test_no_reference_price(self):
        """Test validation when no reference price exists."""
        # Create SKU without reference price
        sku_no_ref = SKU.objects.create(
            code='NOREF001',
            name='No Reference SKU',
            manufacturer='Test Corp',
            pack_size_kg=Decimal('50.00'),
            is_active=True
        )
        
        result = validate_price(
            sku=sku_no_ref,
            district=self.district,
            price=Decimal('1000.00'),
            retailer=self.retailer,
            user=self.user
        )
        
        self.assertFalse(result['valid'])
        self.assertIn('No reference price found', result['reason'])
    
    def test_district_specific_reference_price(self):
        """Test that district-specific reference price takes priority."""
        # Create district-specific reference price
        district_ref_price = ReferencePrice.objects.create(
            sku=self.sku,
            district=self.district,
            price=Decimal('900.00'),  # Lower than global
            effective_from=timezone.now(),
            is_active=True,
            created_by=self.user
        )
        
        price = Decimal('950.00')  # 5.56% markup on district price
        
        result = validate_price(
            sku=self.sku,
            district=self.district,
            price=price,
            retailer=self.retailer,
            user=self.user
        )
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['reference_price'], Decimal('900.00'))
        self.assertAlmostEqual(float(result['markup_percentage']), 5.56, places=1)
    
    def test_exact_maximum_markup(self):
        """Test price at exact maximum markup limit."""
        price = Decimal('1100.00')  # Exactly 10% markup
        
        result = validate_price(
            sku=self.sku,
            district=self.district,
            price=price,
            retailer=self.retailer,
            user=self.user
        )
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['reference_price'], Decimal('1000.00'))
        self.assertAlmostEqual(float(result['markup_percentage']), 10.0, places=1)
