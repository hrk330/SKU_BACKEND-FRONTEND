"""
Tests for published price creation and validation.
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import User
from apps.districts.models import District
from apps.catalog.models import SKU
from apps.retailers.models import Retailer
from apps.pricing.models import ReferencePrice, PublishedPrice


class PublishedPriceCreationTestCase(APITestCase):
    """Test cases for published price creation via API."""
    
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
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='testpass123',
            phone='+1234567890',
            role='gov_admin'
        )
        
        # Create retailer user
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
            created_by=self.admin_user
        )
        
        # Get JWT token for retailer
        refresh = RefreshToken.for_user(self.retailer_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    def test_create_compliant_published_price(self):
        """Test creating a compliant published price."""
        data = {
            'sku': self.sku.id,
            'price': '1050.00',  # 5% markup
            'effective_from': timezone.now().isoformat(),
        }
        
        response = self.client.post('/api/v1/pricing/published-prices/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['compliant'])
        self.assertIn('compliant', response.data['validation_reason'].lower())
        
        # Verify price was saved correctly
        published_price = PublishedPrice.objects.get(id=response.data['id'])
        self.assertEqual(published_price.price, Decimal('1050.00'))
        self.assertTrue(published_price.compliant)
        self.assertEqual(published_price.retailer, self.retailer)
    
    def test_create_non_compliant_published_price(self):
        """Test creating a non-compliant published price."""
        data = {
            'sku': self.sku.id,
            'price': '1200.00',  # 20% markup (exceeds 10% limit)
            'effective_from': timezone.now().isoformat(),
        }
        
        response = self.client.post('/api/v1/pricing/published-prices/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['compliant'])
        self.assertIn('exceeds maximum allowed markup', response.data['validation_reason'])
        
        # Verify price was saved correctly
        published_price = PublishedPrice.objects.get(id=response.data['id'])
        self.assertEqual(published_price.price, Decimal('1200.00'))
        self.assertFalse(published_price.compliant)
        self.assertEqual(published_price.retailer, self.retailer)
    
    def test_create_published_price_unauthorized(self):
        """Test that non-retailer users cannot create published prices."""
        # Create farmer user
        farmer_user = User.objects.create_user(
            username='farmer',
            email='farmer@example.com',
            password='testpass123',
            phone='+1234567892',
            role='farmer'
        )
        
        # Get JWT token for farmer
        refresh = RefreshToken.for_user(farmer_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        data = {
            'sku': self.sku.id,
            'price': '1050.00',
            'effective_from': timezone.now().isoformat(),
        }
        
        response = self.client.post('/api/v1/pricing/published-prices/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_published_price_without_retailer_profile(self):
        """Test creating published price without retailer profile."""
        # Create retailer user without profile
        retailer_no_profile = User.objects.create_user(
            username='retailer2',
            email='retailer2@example.com',
            password='testpass123',
            phone='+1234567893',
            role='retailer'
        )
        
        # Get JWT token
        refresh = RefreshToken.for_user(retailer_no_profile)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        data = {
            'sku': self.sku.id,
            'price': '1050.00',
            'effective_from': timezone.now().isoformat(),
        }
        
        response = self.client.post('/api/v1/pricing/published-prices/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_published_prices_retailer(self):
        """Test that retailers can only see their own published prices."""
        # Create another retailer
        other_retailer_user = User.objects.create_user(
            username='other_retailer',
            email='other@example.com',
            password='testpass123',
            phone='+1234567894',
            role='retailer'
        )
        
        other_retailer = Retailer.objects.create(
            user=other_retailer_user,
            license_no='LIC002',
            business_name='Other Retail Store',
            district=self.district,
            address='456 Other Street',
            contact_person='Other Retailer',
            is_verified=True
        )
        
        # Create published price for other retailer
        PublishedPrice.objects.create(
            sku=self.sku,
            retailer=other_retailer,
            price=Decimal('1100.00'),
            effective_from=timezone.now(),
            compliant=True,
            validation_reason='Test price'
        )
        
        # List published prices
        response = self.client.get('/api/v1/pricing/published-prices/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see own prices (none yet)
        self.assertEqual(len(response.data['results']), 0)
