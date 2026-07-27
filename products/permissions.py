from rest_framework.permissions import BasePermission


class IsFarmer(BasePermission):
    """Allow product management only for farmer accounts."""

    message = "Only farmer accounts can manage products."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "farmer"
        )


class IsProductOwner(BasePermission):
    """Allow changes only by the farmer who owns the product."""

    message = "You can only modify your own products."

    def has_object_permission(self, request, view, obj):
        return obj.farmer_id == request.user.id