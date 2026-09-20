from decimal import Decimal
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Cart, Order, OrderItem
from products.models import Product


@transaction.atomic
def checkout_cart(*, user, delivery_address):
    """Create an order and reserve its stock for a short payment window."""
    cart, _ = Cart.objects.select_for_update().get_or_create(user=user)
    cart = Cart.objects.prefetch_related("items__product").get(pk=cart.pk)

    if not cart.items.exists():
        raise ValidationError({"cart": "Your cart is empty."})

    order = Order.objects.create(
        user=user,
        delivery_address=delivery_address,
        total_amount=Decimal("0.00"),
        reservation_expires_at=timezone.now() + timedelta(minutes=15),
    )

    total = Decimal("0.00")

    for cart_item in cart.items.all():
        product = Product.objects.select_for_update().get(
            id=cart_item.product_id
        )

        if not product.is_available:
            raise ValidationError({
                "product": f"{product.name} is currently unavailable."
            })

        if product.quantity < cart_item.quantity:
            raise ValidationError({
                "product": f"Insufficient stock for {product.name}."
            })

        subtotal = product.price * cart_item.quantity

        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            unit_price=product.price,
            quantity=cart_item.quantity,
            subtotal=subtotal,
        )

        product.quantity -= cart_item.quantity
        if product.quantity == 0:
            product.is_available = False
        product.save(update_fields=["quantity", "is_available", "updated_at"])

        total += subtotal

    order.total_amount = total
    order.save(update_fields=["total_amount", "updated_at"])
    cart.items.all().delete()

    return order


@transaction.atomic
def release_order_stock(*, order):
    """Return a pending order's reservation exactly once."""
    order = Order.objects.select_for_update().prefetch_related("items").get(pk=order.pk)
    if order.stock_released or order.status != "pending":
        return False
    for item in order.items.all():
        product = Product.objects.select_for_update().get(pk=item.product_id)
        product.quantity += item.quantity
        product.is_available = True
        product.save(update_fields=["quantity", "is_available", "updated_at"])
    order.stock_released = True
    order.status = "cancelled"
    order.save(update_fields=["stock_released", "status", "updated_at"])
    return True


def release_expired_stock_reservations():
    """Release every expired, unpaid stock reservation."""
    expired_orders = Order.objects.filter(status="pending", stock_released=False, reservation_expires_at__lte=timezone.now())
    return sum(int(release_order_stock(order=order)) for order in expired_orders.iterator())
