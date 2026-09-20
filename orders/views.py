from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from products.models import Product
from .models import Cart, CartItem, Order
from .permissions import IsConsumer
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
)
from .services import checkout_cart


class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsConsumer]

    def get_cart(self, user):
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    @action(detail=False, methods=["get"], url_path="current")
    def current(self, request):
        cart = self.get_cart(request.user)
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = checkout_cart(
            user=request.user,
            delivery_address=serializer.validated_data["delivery_address"],
        )

        return Response(
            {
                "message": "Order created successfully.",
                "order": OrderSerializer(order).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsConsumer]

    def get_queryset(self):
        return CartItem.objects.filter(
            cart__user=self.request.user
        ).select_related("product", "product__farmer")

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]

        if not product.is_available:
            raise ValidationError({"product": "This product is unavailable."})

        if product.quantity < quantity:
            raise ValidationError({"quantity": "Requested quantity exceeds stock."})

        cart, _ = Cart.objects.get_or_create(user=self.request.user)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity},
        )

        if not created:
            updated_quantity = cart_item.quantity + quantity

            if updated_quantity > product.quantity:
                raise ValidationError({
                    "quantity": "Requested quantity exceeds stock."
                })

            cart_item.quantity = updated_quantity
            cart_item.save(update_fields=["quantity"])
            serializer.instance = cart_item


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsConsumer]

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user
        ).prefetch_related("items")