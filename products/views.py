from rest_framework import filters, permissions, viewsets
from rest_framework.exceptions import ValidationError

from .models import Product
from .pagination import ProductPagination
from .permissions import IsFarmer, IsProductOwner
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """Public product discovery with farmer-owned product management."""

    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    search_fields = ("name", "description", "location", "category")
    ordering_fields = ("created_at", "price", "quantity", "name")
    ordering = ("-created_at",)

    def get_queryset(self):
        queryset = Product.objects.select_related("farmer").all()
        params = self.request.query_params

        category = params.get("category")
        location = params.get("location")
        available = params.get("available")
        farmer_id = params.get("farmer")
        min_price = params.get("min_price")
        max_price = params.get("max_price")

        if category:
            queryset = queryset.filter(category__iexact=category)

        if location:
            queryset = queryset.filter(location__icontains=location)

        if available is not None:
            if available.lower() not in {"true", "false"}:
                raise ValidationError({"available": "Use true or false."})
            queryset = queryset.filter(is_available=available.lower() == "true")

        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)

        if min_price:
            queryset = queryset.filter(price__gte=min_price)

        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            permission_classes = (permissions.AllowAny,)
        elif self.action == "create":
            permission_classes = (permissions.IsAuthenticated, IsFarmer)
        else:
            permission_classes = (
                permissions.IsAuthenticated,
                IsFarmer,
                IsProductOwner,
            )

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)