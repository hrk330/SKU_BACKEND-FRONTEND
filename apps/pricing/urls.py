from django.urls import path
from . import views

app_name = 'pricing'

urlpatterns = [
    # Reference Prices (Government Admin only)
    path('reference-prices/', views.ReferencePriceListView.as_view(), name='reference_price_list'),
    path('reference-prices/<int:pk>/', views.ReferencePriceDetailView.as_view(), name='reference_price_detail'),
    
    # Published Prices
    path('published-prices/', views.PublishedPriceListView.as_view(), name='published_price_list'),
    path('published-prices/<int:pk>/', views.PublishedPriceDetailView.as_view(), name='published_price_detail'),
    
    # Price Audit (Government Admin only)
    path('audit/', views.PriceAuditListView.as_view(), name='price_audit_list'),
    
    # Admin Dashboard Data
    path('admin/dashboard/', views.admin_dashboard_data, name='admin_dashboard_data'),
]
