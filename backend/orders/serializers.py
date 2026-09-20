from rest_framework import serializers

from products.serializers import ProductSerializer
from .models import Cart, CartItem, Order, OrderItem
from rest_framework import serializers


class CartItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source="product", read_only=True)

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product",
            "product_details",
            "quantity",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "product_details")

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )
        return value


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ("id", "items", "created_at", "updated_at")


class OrderItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source="product", read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "product_details",
            "product_name",
            "unit_price",
            "quantity",
            "subtotal",
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "status",
            "total_amount",
            "delivery_address",
            "reservation_expires_at",
            "stock_released",
            "courier_name",
            "tracking_id",
            "shipped_at",
            "delivered_at",
            "items",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "total_amount",
            "reservation_expires_at",
            "stock_released",
            "courier_name",
            "tracking_id",
            "shipped_at",
            "delivered_at",
            "items",
            "created_at",
            "updated_at",
        )


class CheckoutSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(min_length=10, max_length=1000)


class RazorpayVerifySerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField(max_length=100)
    razorpay_payment_id = serializers.CharField(max_length=100)
    razorpay_signature = serializers.CharField(max_length=200)


class FarmerOrderItemSerializer(serializers.ModelSerializer):
    """Only the fulfilment data relevant to the farmer who owns this item."""

    order_id = serializers.IntegerField(source="order.id", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    delivery_address = serializers.CharField(source="order.delivery_address", read_only=True)
    courier_name = serializers.CharField(source="order.courier_name", read_only=True)
    tracking_id = serializers.CharField(source="order.tracking_id", read_only=True)
    shipped_at = serializers.DateTimeField(source="order.shipped_at", read_only=True)
    delivered_at = serializers.DateTimeField(source="order.delivered_at", read_only=True)
    buyer_username = serializers.CharField(source="order.user.username", read_only=True)
    ordered_at = serializers.DateTimeField(source="order.created_at", read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id", "order_id", "order_status", "buyer_username", "delivery_address",
            "courier_name", "tracking_id", "shipped_at", "delivered_at", "ordered_at",
            "product", "product_name", "unit_price", "quantity", "subtotal",
        )


class FarmerOrderTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("processing", "shipped", "delivered"))
    courier_name = serializers.CharField(max_length=100, required=False, allow_blank=False)
    tracking_id = serializers.CharField(max_length=100, required=False, allow_blank=False)

    def validate(self, attrs):
        if attrs["status"] == "shipped":
            missing = [field for field in ("courier_name", "tracking_id") if not attrs.get(field)]
            if missing:
                raise serializers.ValidationError({field: "This field is required when shipping." for field in missing})
        return attrs
