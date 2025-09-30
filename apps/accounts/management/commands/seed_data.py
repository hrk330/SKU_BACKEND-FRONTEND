from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.districts.models import District
from apps.catalog.models import SKU
from apps.retailers.models import Retailer
from apps.pricing.models import ReferencePrice
from decimal import Decimal
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed initial data for the application'

    def handle(self, *args, **options):
        self.stdout.write('Seeding initial data...')
        
        # Create sample district if it doesn't exist
        district, created = District.objects.get_or_create(
            code='SD001',
            defaults={
                'name': 'Sample District',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(f'Created district: {district.name}')
        
        # Create sample SKUs if they don't exist
        skus_data = [
            {
                'code': 'U001',
                'name': 'Urea 46-0-0',
                'manufacturer': 'Fertilizer Corp',
                'pack_size_kg': Decimal('50.00'),
                'description': 'High quality urea fertilizer with 46% nitrogen content'
            },
            {
                'code': 'D001',
                'name': 'DAP 18-46-0',
                'manufacturer': 'Agro Solutions',
                'pack_size_kg': Decimal('50.00'),
                'description': 'Diammonium phosphate fertilizer with 18% nitrogen and 46% phosphorus'
            },
            {
                'code': 'P001',
                'name': 'Potash 0-0-60',
                'manufacturer': 'Minerals Ltd',
                'pack_size_kg': Decimal('50.00'),
                'description': 'Potassium chloride fertilizer with 60% potassium content'
            }
        ]
        
        for sku_data in skus_data:
            sku, created = SKU.objects.get_or_create(
                code=sku_data['code'],
                defaults=sku_data
            )
            if created:
                self.stdout.write(f'Created SKU: {sku.name}')
        
        # Create government admin user
        admin_user, created = User.objects.get_or_create(
            email='admin@pricegov.com',
            defaults={
                'username': 'admin',
                'first_name': 'Government',
                'last_name': 'Admin',
                'phone': '+1234567890',
                'role': 'gov_admin',
                'is_verified': True,
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(f'Created admin user: {admin_user.email}')
            self.stdout.write('Admin password: admin123')
        
        # Create retailer user
        retailer_user, created = User.objects.get_or_create(
            email='retailer@example.com',
            defaults={
                'username': 'retailer',
                'first_name': 'John',
                'last_name': 'Retailer',
                'phone': '+1234567891',
                'role': 'retailer',
                'is_verified': True
            }
        )
        if created:
            retailer_user.set_password('retailer123')
            retailer_user.save()
            self.stdout.write(f'Created retailer user: {retailer_user.email}')
            self.stdout.write('Retailer password: retailer123')
        
        # Create retailer profile
        if created or not hasattr(retailer_user, 'retailer_profile'):
            retailer_profile, created = Retailer.objects.get_or_create(
                user=retailer_user,
                defaults={
                    'license_no': 'LIC001',
                    'business_name': 'Sample Retail Store',
                    'district': district,
                    'address': '123 Main Street, Sample District',
                    'contact_person': 'John Retailer',
                    'is_verified': True
                }
            )
            if created:
                self.stdout.write(f'Created retailer profile: {retailer_profile.business_name}')
        
        # Create farmer user
        farmer_user, created = User.objects.get_or_create(
            email='farmer@example.com',
            defaults={
                'username': 'farmer',
                'first_name': 'Jane',
                'last_name': 'Farmer',
                'phone': '+1234567892',
                'role': 'farmer',
                'is_verified': True
            }
        )
        if created:
            farmer_user.set_password('farmer123')
            farmer_user.save()
            self.stdout.write(f'Created farmer user: {farmer_user.email}')
            self.stdout.write('Farmer password: farmer123')
        
        # Create reference prices
        reference_prices_data = [
            {'sku_code': 'U001', 'price': Decimal('1150.00')},
            {'sku_code': 'D001', 'price': Decimal('1800.00')},
            {'sku_code': 'P001', 'price': Decimal('1200.00')}
        ]
        
        for ref_data in reference_prices_data:
            sku = SKU.objects.get(code=ref_data['sku_code'])
            ref_price, created = ReferencePrice.objects.get_or_create(
                sku=sku,
                district=None,  # Global reference price
                effective_from=timezone.now(),
                defaults={
                    'price': ref_data['price'],
                    'is_active': True,
                    'created_by': admin_user
                }
            )
            if created:
                self.stdout.write(f'Created reference price for {sku.name}: {ref_price.price}')
        
        self.stdout.write(
            self.style.SUCCESS('Successfully seeded initial data!')
        )
        self.stdout.write('\nSample users created:')
        self.stdout.write('Admin: admin@pricegov.com / admin123')
        self.stdout.write('Retailer: retailer@example.com / retailer123')
        self.stdout.write('Farmer: farmer@example.com / farmer123')
