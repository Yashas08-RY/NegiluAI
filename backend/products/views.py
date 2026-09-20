from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .filters import ProductFilter
from .models import Product, Wishlist, Review
from .pagination import ProductPagination
from .permissions import IsFarmer, IsProductOwner, IsVerifiedFarmer
from .serializers import ProductImageSerializer, ProductSerializer, WishlistSerializer, ReviewSerializer
from .services import create_product_image, set_primary_product_image, delete_product_image


class ProductViewSet(viewsets.ModelViewSet):
    """Public product discovery with farmer-owned product management."""

    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_class = ProductFilter

    search_fields = ("name", "description", "location", "category")
    ordering_fields = ("created_at", "price", "quantity", "name")
    ordering = ("-created_at",)

    def get_queryset(self):
        queryset = (
            Product.objects
            .select_related("farmer", "farmer__farmer_profile")
            .prefetch_related("images")
            .all()
        )
        user = self.request.user
        is_admin = user.is_authenticated and (user.is_staff or user.is_superuser or user.role == "admin")
        if is_admin:
            return queryset
        if user.is_authenticated and user.role == "farmer":
            return queryset.filter(Q(approval_status="approved") | Q(farmer=user))
        return queryset.filter(approval_status="approved")

    def get_permissions(self):
        """Keep browsing public while protecting farmer-owned actions."""

        if self.action in ("list", "retrieve"):
            permission_classes = (permissions.AllowAny,)

        elif self.action == "images" and self.request.method == "GET":
            permission_classes = (permissions.AllowAny,)

        elif self.action == "reviews":
            permission_classes = (permissions.AllowAny,) if self.request.method == "GET" else (permissions.IsAuthenticated,)

        elif self.action == "create":
            permission_classes = (
                permissions.IsAuthenticated,
                IsVerifiedFarmer,
            )

        else:
            permission_classes = (
                permissions.IsAuthenticated,
                IsFarmer,
                IsProductOwner,
            )

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Assign product ownership from the authenticated farmer."""
        user = self.request.user
        profile = getattr(user, "farmer_profile", None)
        is_verified = getattr(profile, "is_verified", False) if profile else False
        initial_status = "approved" if is_verified or settings.DEBUG else "pending"
        serializer.save(farmer=user, approval_status=initial_status)

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
    )
    def images(self, request, pk=None):
        """List public images or upload an image as the owning farmer."""

        product = self.get_object()

        if request.method == "GET":
            serializer = ProductImageSerializer(
                product.images.all(),
                many=True,
            )
            return Response(serializer.data)

        serializer = ProductImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_image = create_product_image(
            product=product,
            validated_data=serializer.validated_data,
        )

        return Response(
            ProductImageSerializer(product_image).data,
            status=201,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>\d+)",
    )
    def delete_image(self, request, pk=None, image_id=None):
        """Delete an image belonging to this product."""
        product = self.get_object()
        try:
            image = product.images.get(pk=image_id)
        except Product.images.model.DoesNotExist:
            return Response(
                {"detail": "Image not found."},
                status=404,
            )

        delete_product_image(image=image)
        return Response(status=204)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"images/(?P<image_id>\d+)/primary",
    )
    def set_primary_image(self, request, pk=None, image_id=None):
        """Set a product image as primary."""
        product = self.get_object()
        try:
            image = product.images.get(pk=image_id)
        except Product.images.model.DoesNotExist:
            return Response(
                {"detail": "Image not found."},
                status=404,
            )

        set_primary_product_image(image=image)
        return Response(ProductImageSerializer(image).data)

    @action(detail=True, methods=["get", "post"], url_path="reviews")
    def reviews(self, request, pk=None):
        """List reviews for a product or post/update a review as an authenticated user."""
        product = self.get_object()

        if request.method == "GET":
            reviews_list = product.reviews.all().select_related("user")
            serializer = ReviewSerializer(reviews_list, many=True)
            return Response(serializer.data)

        if not request.user.is_authenticated or request.user.role != "consumer":
            return Response({"detail": "Only consumer accounts can leave reviews."}, status=403)

        has_delivered_order = product.order_items.filter(
            order__user=request.user,
            order__status="delivered",
        ).exists()
        if not has_delivered_order:
            return Response(
                {"detail": "You can review this product only after a delivered purchase."},
                status=403,
            )

        rating = request.data.get("rating")
        comment = request.data.get("comment", "")

        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return Response({"detail": "Rating must be between 1 and 5."}, status=400)
        if rating < 1 or rating > 5:
            return Response({"detail": "Rating must be between 1 and 5."}, status=400)

        review, created = Review.objects.update_or_create(
            product=product,
            user=request.user,
            defaults={
                "rating": rating,
                "comment": comment,
            },
        )
        return Response(ReviewSerializer(review).data, status=201 if created else 200)


class WishlistViewSet(viewsets.ModelViewSet):
    """Wishlist items for authenticated users."""

    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Wishlist.objects
            .filter(user=self.request.user)
            .select_related("product", "product__farmer", "product__farmer__farmer_profile")
            .prefetch_related("product__images")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="toggle")
    def toggle(self, request):
        product_id = request.data.get("product_id") or request.data.get("product")
        if not product_id:
            return Response({"detail": "product_id is required."}, status=400)

        existing = Wishlist.objects.filter(user=request.user, product_id=product_id).first()
        if existing:
            existing.delete()
            return Response({"status": "removed", "product_id": product_id})

        item = Wishlist.objects.create(user=request.user, product_id=product_id)
        return Response({"status": "added", "item": WishlistSerializer(item).data}, status=201)
