from rest_framework import serializers

from orders.models import OrderItem


class FarmerDashboardOverviewSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    available_products = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    items_sold = serializers.IntegerField()
    total_revenue = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )


class FarmerSaleItemSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(read_only=True)
    order_status = serializers.CharField(
        source="order.status",
        read_only=True,
    )
    buyer_username = serializers.CharField(
        source="order.user.username",
        read_only=True,
    )
    ordered_at = serializers.DateTimeField(
        source="order.created_at",
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "order_id",
            "order_status",
            "buyer_username",
            "ordered_at",
            "product",
            "product_name",
            "unit_price",
            "quantity",
            "subtotal",
        )
        read_only_fields = fields