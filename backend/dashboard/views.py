from decimal import Decimal
from django.db.models import Sum, Count
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from users.models import User, FarmerProfile
from products.models import Product, Wishlist
from orders.models import Order, OrderItem, Cart
from products.permissions import IsFarmer
from products.serializers import ProductSerializer

from .pagination import DashboardPagination
from .serializers import (
    FarmerDashboardOverviewSerializer,
    FarmerSaleItemSerializer,
)
from .services import get_farmer_overview, get_farmer_sales_items


class FarmerDashboardViewSet(viewsets.GenericViewSet):
    """Farmer-only endpoints for products, sales, and summary analytics."""

    permission_classes = [permissions.IsAuthenticated, IsFarmer]
    pagination_class = DashboardPagination

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        overview_data = get_farmer_overview(request.user)
        serializer = FarmerDashboardOverviewSerializer(overview_data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="products")
    def products(self, request):
        queryset = (
            request.user.product_set
            .select_related("farmer", "farmer__farmer_profile")
            .prefetch_related("images")
            .all()
            .order_by("-created_at")
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ProductSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="sales")
    def sales(self, request):
        queryset = get_farmer_sales_items(request.user)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FarmerSaleItemSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = FarmerSaleItemSerializer(queryset, many=True)
        return Response(serializer.data)


class ConsumerDashboardViewSet(viewsets.GenericViewSet):
    """Consumer analytics and summary endpoint."""

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        user = request.user
        orders = Order.objects.filter(user=user)
        total_orders = orders.count()
        total_spent = orders.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")
        wishlist_count = Wishlist.objects.filter(user=user).count()
        
        cart_items_count = 0
        try:
            cart = Cart.objects.get(user=user)
            cart_items_count = cart.items.count()
        except Cart.DoesNotExist:
            pass

        return Response({
            "total_orders": total_orders,
            "total_spent": total_spent,
            "wishlist_count": wishlist_count,
            "cart_count": cart_items_count,
        })


class AdminDashboardViewSet(viewsets.GenericViewSet):
    """Admin analytics, user management, and product approvals."""

    permission_classes = [permissions.IsAuthenticated]

    def _check_admin(self, request):
        return request.user.is_staff or request.user.is_superuser or request.user.role == "admin"

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        if not self._check_admin(request):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        total_users = User.objects.count()
        total_farmers = User.objects.filter(role="farmer").count()
        total_consumers = User.objects.filter(role="consumer").count()
        total_products = Product.objects.count()
        total_orders = Order.objects.count()
        total_revenue = Order.objects.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")

        pending_verifications = FarmerProfile.objects.filter(is_verified=False).count()
        pending_approvals = Product.objects.filter(approval_status="pending").count()

        return Response({
            "total_users": total_users,
            "total_farmers": total_farmers,
            "total_consumers": total_consumers,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "pending_verifications": pending_verifications,
            "pending_approvals": pending_approvals,
        })

    @action(detail=False, methods=["get"], url_path="users")
    def users(self, request):
        if not self._check_admin(request):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        users = User.objects.all().order_by("-date_joined")
        data = []
        for u in users:
            farm_info = None
            if hasattr(u, "farmer_profile"):
                fp = u.farmer_profile
                farm_info = {
                    "farm_name": fp.farm_name,
                    "phone": fp.phone,
                    "district": fp.district,
                    "state": fp.state,
                    "village": fp.village,
                    "is_verified": fp.is_verified,
                }
            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role or ("admin" if (u.is_staff or u.is_superuser) else "consumer"),
                "is_staff": u.is_staff,
                "is_superuser": u.is_superuser,
                "date_joined": u.date_joined,
                "farmer_profile": farm_info,
            })

        return Response({"count": len(data), "results": data})

    @action(detail=False, methods=["post"], url_path=r"users/(?P<user_id>\d+)/verify")
    def verify_farmer(self, request, user_id=None):
        if not self._check_admin(request):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = FarmerProfile.objects.get(user_id=user_id)
            profile.is_verified = not profile.is_verified
            profile.save()
            return Response({"status": "success", "is_verified": profile.is_verified})
        except FarmerProfile.DoesNotExist:
            return Response({"error": "Farmer profile not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["post"], url_path=r"products/(?P<product_id>\d+)/approve")
    def approve_product(self, request, product_id=None):
        if not self._check_admin(request):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        try:
            product = Product.objects.get(id=product_id)
            next_status = request.data.get("status", "approved")
            if next_status not in {"approved", "rejected", "pending"}:
                return Response({"detail": "status must be approved, rejected, or pending."}, status=400)
            product.approval_status = next_status
            product.moderation_note = request.data.get("moderation_note", "") if next_status == "rejected" else ""
            product.save(update_fields=["approval_status", "moderation_note", "updated_at"])
            return Response({
                "status": "success",
                "approval_status": product.approval_status,
                "moderation_note": product.moderation_note,
            })
        except Product.DoesNotExist:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
