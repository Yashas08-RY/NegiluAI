import razorpay
import hashlib
import hmac

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Payment, PaymentWebhookEvent
from .services import release_order_stock


def get_razorpay_client():
    """Create an authenticated Razorpay client."""

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise ValidationError(
            "Razorpay credentials are not configured on the server."
        )

    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


def verify_razorpay_webhook_signature(*, raw_body, signature):
    """Validate a webhook using Razorpay's independent webhook secret."""
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise ValidationError("Razorpay webhook secret is not configured on the server.")
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return bool(signature and hmac.compare_digest(expected, signature))


@transaction.atomic
def process_razorpay_webhook(*, event_id, event_type, payload):
    """Apply a verified Razorpay event once; duplicate deliveries are harmless."""
    event, created = PaymentWebhookEvent.objects.get_or_create(
        event_id=event_id,
        defaults={"event_type": event_type, "payload": payload},
    )
    if not created:
        return {"duplicate": True, "handled": False}

    payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})
    razorpay_order_id = payment_data.get("order_id")
    if not razorpay_order_id:
        event.processed_at = timezone.now()
        event.save(update_fields=["processed_at"])
        return {"duplicate": False, "handled": False}

    payment = Payment.objects.select_for_update().select_related("order").filter(
        razorpay_order_id=razorpay_order_id,
    ).first()
    if not payment:
        event.processed_at = timezone.now()
        event.save(update_fields=["processed_at"])
        return {"duplicate": False, "handled": False}

    if event_type in {"payment.captured", "order.paid"}:
        if payment.status != "paid":
            payment.razorpay_payment_id = payment_data.get("id") or payment.razorpay_payment_id
            payment.status = "paid"
            payment.paid_at = timezone.now()
            payment.save(update_fields=["razorpay_payment_id", "status", "paid_at"])
            payment.order.status = "confirmed"
            payment.order.save(update_fields=["status", "updated_at"])
    elif event_type == "payment.failed" and payment.status != "paid":
        payment.status = "failed"
        payment.save(update_fields=["status"])
        release_order_stock(order=payment.order)

    event.processed_at = timezone.now()
    event.save(update_fields=["processed_at"])
    return {"duplicate": False, "handled": True}


@transaction.atomic
def create_razorpay_order(*, order):
    """Create one Razorpay payment order for a ನೇಗಿಲುai order."""

    if order.status != "pending" or order.stock_released:
        raise ValidationError("This order is no longer awaiting payment.")
    payment, _ = Payment.objects.select_for_update().get_or_create(
        order=order,
        defaults={
            "amount": order.total_amount,
            "currency": "INR",
        },
    )

    if payment.status == "paid":
        raise ValidationError("This order has already been paid.")

    if payment.razorpay_order_id:
        return payment

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        if not settings.ALLOW_DEMO_PAYMENTS:
            raise ValidationError("Payment processing is not configured on the server.")
        payment.razorpay_order_id = f"order_demo_{order.id}"
        payment.save(update_fields=["razorpay_order_id"])
        return payment

    client = get_razorpay_client()

    razorpay_order = client.order.create({
        "amount": int(order.total_amount * 100),
        "currency": "INR",
        "receipt": f"agritrade_{order.id}",
        "notes": {
            "agritrade_order_id": str(order.id),
            "customer_id": str(order.user_id),
        },
    })

    payment.razorpay_order_id = razorpay_order["id"]
    payment.save(update_fields=["razorpay_order_id"])

    return payment


@transaction.atomic
def verify_razorpay_payment(*, order, payment_data):
    """Verify Razorpay's signature and mark the order as paid."""

    payment = Payment.objects.select_for_update().get(order=order)

    if payment.status == "paid":
        return payment

    if payment.razorpay_order_id != payment_data["razorpay_order_id"]:
        raise ValidationError({
            "razorpay_order_id": (
                "This Razorpay order does not match the ನೇಗಿಲುai order."
            )
        })

    if payment.razorpay_order_id.startswith("order_demo_") or not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
        if not settings.ALLOW_DEMO_PAYMENTS:
            raise ValidationError("Payment processing is not configured on the server.")
        payment.razorpay_payment_id = payment_data.get("razorpay_payment_id") or f"pay_demo_{order.id}"
        payment.status = "paid"
        payment.paid_at = timezone.now()
        payment.save(update_fields=["razorpay_payment_id", "status", "paid_at"])
        order.status = "confirmed"
        order.save(update_fields=["status", "updated_at"])
        return payment

    client = get_razorpay_client()

    try:
        client.utility.verify_payment_signature(payment_data)
    except razorpay.errors.SignatureVerificationError:
        payment.status = "failed"
        payment.save(update_fields=["status"])
        release_order_stock(order=order)
        return None

    payment.razorpay_payment_id = payment_data["razorpay_payment_id"]
    payment.status = "paid"
    payment.paid_at = timezone.now()
    payment.save(update_fields=[
        "razorpay_payment_id",
        "status",
        "paid_at",
    ])

    order.status = "confirmed"
    order.save(update_fields=["status", "updated_at"])

    return payment
