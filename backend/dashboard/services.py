from decimal import Decimal

from django.db.models import Sum

from orders.models import OrderItem
from products.models import Product


COMPLETED_ORDER_STATUSES = (
    "confirmed",
    "processing",
    "shipped",
    "delivered",
)


def get_farmer_sales_items(farmer):
    """Return order items sold by one farmer."""

    return OrderItem.objects.filter(
        product__farmer=farmer,
        order__status__in=COMPLETED_ORDER_STATUSES,
    ).select_related(
        "product",
        "order",
        "order__user",
    ).order_by("-order__created_at")


def get_farmer_overview(farmer):
    """Calculate headline dashboard data for one farmer."""

    products = Product.objects.filter(farmer=farmer)
    sales_items = get_farmer_sales_items(farmer)

    total_revenue = sales_items.aggregate(
        total=Sum("subtotal")
    )["total"] or Decimal("0.00")

    return {
        "total_products": products.count(),
        "available_products": products.filter(is_available=True).count(),
        "total_orders": sales_items.values("order_id").distinct().count(),
        "items_sold": sales_items.aggregate(
            total=Sum("quantity")
        )["total"] or 0,
        "total_revenue": total_revenue,
    }