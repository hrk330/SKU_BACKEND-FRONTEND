from django.urls import path
from . import views

app_name = 'farmer_pricing'

urlpatterns = [
    path('prices/', views.farmer_price_query, name='farmer_price_query'),
]
