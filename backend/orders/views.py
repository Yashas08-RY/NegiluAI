import hashlib
import json

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.conf import settings
from .payment_services import (
    create_razorpay_order,
    process_razorpay_webhook,
    verify_razorpay_webhook_signature,
    verify_razorpay_payment,
)

from products.models import Product
from .models import Cart, CartItem, Order, OrderItem
from .permissions import IsConsumer
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
    FarmerOrderItemSerializer,
    FarmerOrderTransitionSerializer,
    RazorpayVerifySerializer,
)
from .services import checkout_cart, release_expired_stock_reservations, release_order_stock


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
        release_expired_stock_reservations()
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

        if product.farmer_id == self.request.user.id:
            raise ValidationError({"product": "You cannot add your own product to the cart."})

        if product.approval_status != "approved":
            raise ValidationError({"product": "This product is not approved for sale."})

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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user
        ).prefetch_related("items")

    @action(
        detail=False,
        methods=["post"],
        url_path="razorpay-webhook",
        permission_classes=[permissions.AllowAny],
    )
    def razorpay_webhook(self, request):
        """Receive Razorpay's signed payment events without user authentication."""
        raw_body = request.body
        signature = request.headers.get("X-Razorpay-Signature", "")
        if not verify_razorpay_webhook_signature(raw_body=raw_body, signature=signature):
            return Response({"detail": "Invalid webhook signature."}, status=400)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return Response({"detail": "Invalid webhook payload."}, status=400)

        event_id = request.headers.get("X-Razorpay-Event-Id") or hashlib.sha256(raw_body).hexdigest()
        result = process_razorpay_webhook(
            event_id=event_id,
            event_type=payload.get("event", ""),
            payload=payload,
        )
        return Response({"status": "ok", **result})

    @action(
        detail=True,
        methods=["post"],
        url_path="create-payment-order",
    )
    def create_payment_order(self, request, pk=None):
        """Create or return the Razorpay order for this order."""

        order = self.get_object()
        if order.reservation_expires_at and order.reservation_expires_at <= timezone.now():
            release_order_stock(order=order)
            return Response({"detail": "This payment reservation has expired. Please place the order again."}, status=400)
        payment = create_razorpay_order(order=order)

        return Response({
            "message": "Razorpay order created successfully.",
            "order_id": order.id,
            "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_demo",
            "razorpay_order_id": payment.razorpay_order_id,
            "amount": int(payment.amount * 100),
            "currency": payment.currency,
            "is_demo": not bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET),
        })

    @action(
        detail=True,
        methods=["post"],
        url_path="verify-payment",
    )
    def verify_payment(self, request, pk=None):
        """Verify the signature returned by Razorpay Checkout."""

        order = self.get_object()

        if order.reservation_expires_at and order.reservation_expires_at <= timezone.now():
            release_order_stock(order=order)
            return Response({"detail": "This payment reservation has expired. Please place the order again."}, status=400)

        serializer = RazorpayVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = verify_razorpay_payment(
            order=order,
            payment_data=serializer.validated_data,
        )

        if payment is None:
            return Response({"detail": "Payment signature verification failed. Stock has been returned."}, status=400)

        return Response({
            "message": "Payment verified successfully.",
            "order_id": order.id,
            "order_status": order.status,
            "payment_status": payment.status,
            "razorpay_payment_id": payment.razorpay_payment_id,
        })

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancel an unpaid order and release its reserved stock."""
        order = self.get_object()
        if order.status != "pending":
            return Response({"detail": "Only unpaid pending orders can be cancelled."}, status=400)
        release_order_stock(order=order)
        return Response({"message": "Order cancelled and stock returned.", "order_status": "cancelled"})


class FarmerOrderItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Fulfilment view limited to products owned by the authenticated farmer."""

    serializer_class = FarmerOrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != "farmer":
            return OrderItem.objects.none()
        return OrderItem.objects.filter(product__farmer=self.request.user).select_related(
            "order", "order__user", "product"
        ).order_by("-order__created_at", "-id")


class FarmerOrderViewSet(viewsets.GenericViewSet):
    """Advance an order only when every line item belongs to the caller."""

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"], url_path="transition")
    @transaction.atomic
    def transition(self, request, pk=None):
        if request.user.role != "farmer":
            return Response({"detail": "Farmer access is required."}, status=status.HTTP_403_FORBIDDEN)
        order = Order.objects.select_for_update().prefetch_related("items__product").filter(pk=pk).first()
        if not order:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        items = list(order.items.all())
        if not items or any(item.product.farmer_id != request.user.id for item in items):
            return Response({"detail": "You may only update orders containing your products."}, status=status.HTTP_403_FORBIDDEN)

        serializer = FarmerOrderTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_status = serializer.validated_data["status"]
        transitions = {"confirmed": "processing", "processing": "shipped", "shipped": "delivered"}
        if transitions.get(order.status) != target_status:
            return Response({"detail": f"Cannot transition an order from {order.status} to {target_status}."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = target_status
        update_fields = ["status", "updated_at"]
        if target_status == "shipped":
            order.courier_name = serializer.validated_data["courier_name"]
            order.tracking_id = serializer.validated_data["tracking_id"]
            order.shipped_at = timezone.now()
            update_fields.extend(["courier_name", "tracking_id", "shipped_at"])
        elif target_status == "delivered":
            order.delivered_at = timezone.now()
            update_fields.append("delivered_at")
        order.save(update_fields=update_fields)
        return Response(OrderSerializer(order).data)
