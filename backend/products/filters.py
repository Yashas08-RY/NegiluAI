import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    """Filter products by category, location, availability, and price range."""

    min_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="gte",
    )
    max_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="lte",
    )
    available = django_filters.BooleanFilter(
        field_name="is_available",
    )
    location = django_filters.CharFilter(
        field_name="location",
        lookup_expr="icontains",
    )
    category = django_filters.CharFilter(
        field_name="category",
        lookup_expr="iexact",
    )

    class Meta:
        model = Product
        fields = ["category", "location", "available", "min_price", "max_price", "farmer"]
