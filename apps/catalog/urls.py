from django.urls import path
from . import views

app_name = 'catalog'

urlpatterns = [
    path('', views.SKUListView.as_view(), name='sku_list'),
    path('<int:pk>/', views.SKUDetailView.as_view(), name='sku_detail'),
]
