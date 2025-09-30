from django.urls import path
from . import views

app_name = 'districts'

urlpatterns = [
    path('', views.DistrictListView.as_view(), name='district_list'),
    path('tree/', views.district_tree_view, name='district_tree'),
    path('<int:district_id>/children/', views.district_children_view, name='district_children'),
    path('<int:pk>/', views.DistrictDetailView.as_view(), name='district_detail'),
]
