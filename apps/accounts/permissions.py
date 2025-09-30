from rest_framework.permissions import BasePermission


class IsGovAdmin(BasePermission):
    """Permission class for Government Admin users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_gov_admin
        )


class IsDistrictOfficer(BasePermission):
    """Permission class for District Officer users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_district_officer
        )


class IsRetailer(BasePermission):
    """Permission class for Retailer users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_retailer
        )


class IsFarmer(BasePermission):
    """Permission class for Farmer users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_farmer
        )


class IsInspector(BasePermission):
    """Permission class for Inspector users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_inspector
        )


class IsGovAdminOrDistrictOfficer(BasePermission):
    """Permission class for Government Admin or District Officer users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_gov_admin or request.user.is_district_officer)
        )


class IsGovAdminOrRetailer(BasePermission):
    """Permission class for Government Admin or Retailer users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_gov_admin or request.user.is_retailer)
        )
