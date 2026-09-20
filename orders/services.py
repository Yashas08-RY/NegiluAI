from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Cart, Order, OrderItem
from products.models import Product


@transaction.atomic
def checkout_cart(*, user, delivery_address):
    """Create an order and reduce stock safely in one database transaction."""
    cart = Cart.objects.select_for_update().prefetch_related(
        "items__product"
    ).get(user=user)

    if not cart.items.exists():
        raise ValidationError({"cart": "Your cart is empty."})

    order = Order.objects.create(
        user=user,
        delivery_address=delivery_address,
        total_amount=Decimal("0.00"),
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