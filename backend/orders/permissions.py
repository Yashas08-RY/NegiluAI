from rest_framework.permissions import BasePermission


class IsConsumer(BasePermission):
    message = "Only consumer accounts can use the cart and checkout."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "consumer"
        )