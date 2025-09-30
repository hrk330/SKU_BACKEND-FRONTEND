from django.urls import path
from . import views

app_name = 'complaints'

urlpatterns = [
    # General complaint endpoints
    path('', views.ComplaintListView.as_view(), name='complaint_list'),
    path('<int:pk>/', views.ComplaintDetailView.as_view(), name='complaint_detail'),
    path('my-complaints/', views.MyComplaintsView.as_view(), name='my_complaints'),
    
    # Price violation specific endpoints
    path('price-violation/', views.PriceViolationComplaintCreateView.as_view(), name='price_violation_create'),
    
    # Status and resolution management
    path('<int:pk>/status/', views.ComplaintStatusUpdateView.as_view(), name='complaint_status_update'),
    path('<int:pk>/resolve/', views.ComplaintResolutionView.as_view(), name='complaint_resolution'),
    
    # Evidence management
    path('<int:complaint_id>/evidence/', views.ComplaintEvidenceUploadView.as_view(), name='complaint_evidence_upload'),
    
    # Assignment and management
    path('<int:complaint_id>/assign/', views.assign_complaint, name='assign_complaint'),
    
    # Admin endpoints
    path('admin/', views.AdminComplaintManagementView.as_view(), name='admin_complaint_management'),
    
    # Statistics
    path('statistics/', views.complaint_statistics, name='complaint_statistics'),
]
