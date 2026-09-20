from rest_framework.permissions import BasePermission

from users.models import FarmerProfile


class IsFarmer(BasePermission):
    """Allow product management only for farmer accounts."""

    message = "Only farmer accounts can manage products."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "farmer"
        )


class IsVerifiedFarmer(IsFarmer):
    """Require an administrator-approved farmer before a listing is created."""

    message = "Only verified farmer accounts can create product listings."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return FarmerProfile.objects.filter(
            user=request.user,
            is_verified=True,
        ).exists()


class IsProductOwner(BasePermission):
    """Allow changes only by the farmer who owns the product."""

    message = "You can only modify your own products."

    def has_object_permission(self, request, view, obj):
        return obj.farmer_id == request.user.id
