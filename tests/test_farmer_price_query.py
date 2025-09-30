"""
Tests for farmer price query endpoint with caching.
"""

from decimal import Decimal
from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import User
from apps.districts.models import District
from apps.catalog.models import SKU
from apps.retailers.models import Retailer
from apps.pricing.models import ReferencePrice, PublishedPrice


class FarmerPriceQueryTestCase(APITestCase):
    """Test cases for farmer price query endpoint."""
    
    def setUp(self):
        """Set up test data."""
        # Clear cache
        cache.clear()
        
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
        
        # Create farmer user
        self.farmer_user = User.objects.create_user(
            username='farmer',
            email='farmer@example.com',
            password='testpass123',
            phone='+1234567892',
            role='farmer'
        )
        
        # Create retailer
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
        
        # Create published prices
        self.published_price1 = PublishedPrice.objects.create(
            sku=self.sku,
            retailer=self.retailer,
            price=Decimal('1050.00'),
            effective_from=timezone.now(),
            compliant=True,
            validation_reason='Compliant price'
        )
        
        self.published_price2 = PublishedPrice.objects.create(
            sku=self.sku,
            retailer=self.retailer,
            price=Decimal('1100.00'),
            effective_from=timezone.now(),
            compliant=True,
            validation_reason='Compliant price'
        )
        
        # Get JWT token for farmer
        refresh = RefreshToken.for_user(self.farmer_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    def test_farmer_price_query_success(self):
        """Test successful farmer price query."""
        response = self.client.get(
            f'/api/v1/farmer/prices/?sku={self.sku.id}&district={self.district.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response structure
        self.assertIn('sku', response.data)
        self.assertIn('reference_price', response.data)
        self.assertIn('top_retailer_prices', response.data)
        
        # Check SKU data
        self.assertEqual(response.data['sku']['id'], self.sku.id)
        self.assertEqual(response.data['sku']['name'], self.sku.name)
        
        # Check reference price
        self.assertEqual(response.data['reference_price'], '1000.00')
        
        # Check retailer prices (should be sorted by price ascending)
        retailer_prices = response.data['top_retailer_prices']
        self.assertEqual(len(retailer_prices), 2)
        self.assertEqual(retailer_prices[0]['price'], '1050.00')
        self.assertEqual(retailer_prices[1]['price'], '1100.00')
    
    def test_farmer_price_query_missing_parameters(self):
        """Test farmer price query with missing parameters."""
        # Missing district
        response = self.client.get(f'/api/v1/farmer/prices/?sku={self.sku.id}')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Both sku and district parameters are required', response.data['error'])
        
        # Missing SKU
        response = self.client.get(f'/api/v1/farmer/prices/?district={self.district.id}')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Both sku and district parameters are required', response.data['error'])
    
    def test_farmer_price_query_invalid_sku(self):
        """Test farmer price query with invalid SKU."""
        response = self.client.get(
            f'/api/v1/farmer/prices/?sku=99999&district={self.district.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('SKU not found', response.data['error'])
    
    def test_farmer_price_query_invalid_district(self):
        """Test farmer price query with invalid district."""
        response = self.client.get(
            f'/api/v1/farmer/prices/?sku={self.sku.id}&district=99999'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('District not found', response.data['error'])
    
    def test_farmer_price_query_unauthorized(self):
        """Test that non-farmer users cannot access farmer price query."""
        # Use retailer token
        refresh = RefreshToken.for_user(self.retailer_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = self.client.get(
            f'/api/v1/farmer/prices/?sku={self.sku.id}&district={self.district.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_farmer_price_query_caching(self):
        """Test that farmer price query uses caching."""
        # First request
        response1 = self.client.get(
            f'/api/v1/farmer/prices/?sku={self.sku.id}&district={self.district.id}'
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Second request should use cache
        response2 = self.client.get(
            f'/api/v1/farmer/prices/?sku={self.sku.id}&district={self.district.id}'
        )
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Responses should be identical
        self.assertEqual(response1.data, response2.data)
    
    def test_farmer_price_query_only_compliant_prices(self):
        """Test that only compliant published prices are returned."""
        # Create non-compliant published price
        non_compliant_price = PublishedPrice.objects.create(
            sku=self.sku,
            retailer=self.retailer,
            price=Decimal('1200.00'),  # 20% markup
            effective_from=timezone.now(),
            compliant=False,
            validation_reason='Exceeds markup limit'
        )
        
        response = self.client.get(
            f'/api/v1/farmer/prices/?sku={self.sku.id}&district={self.district.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should only return compliant prices
        retailer_prices = response.data['top_retailer_prices']
        self.assertEqual(len(retailer_prices), 2)  # Only the 2 compliant prices
        
        # Verify non-compliant price is not included
        prices = [price['price'] for price in retailer_prices]
        self.assertNotIn('1200.00', prices)
    
    def test_farmer_price_query_no_retailer_prices(self):
        """Test farmer price query when no retailer prices exist."""
        # Delete all published prices
        PublishedPrice.objects.all().delete()
        
        response = self.client.get(
            f'/api/v1/farmer/prices/?sku={self.sku.id}&district={self.district.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['reference_price'], '1000.00')
        self.assertEqual(len(response.data['top_retailer_prices']), 0)
