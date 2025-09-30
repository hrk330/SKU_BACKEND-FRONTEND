from django.urls import path
from . import views

app_name = 'retailers'

urlpatterns = [
    path('', views.RetailerListView.as_view(), name='retailer_list'),
    path('profile/', views.RetailerProfileView.as_view(), name='retailer_profile'),
    path('create-profile/', views.create_retailer_profile, name='create_retailer_profile'),
    path('<int:pk>/', views.RetailerDetailView.as_view(), name='retailer_detail'),
]
