import hashlib
import hmac
import json

from datetime import timedelta

from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product
from users.models import User

from .models import CartItem, Order, Payment, PaymentWebhookEvent


class CheckoutApiTests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username="seller",
            password="SafePass123!",
            role="farmer",
        )
        self.consumer = User.objects.create_user(
            username="buyer",
            password="SafePass123!",
            role="consumer",
        )
        self.product = Product.objects.create(
            farmer=self.farmer,
            name="Fresh Tomato",
            category="Vegetables",
            description="Fresh tomatoes harvested this morning.",
            price="38.00",
            quantity=10,
            unit="kg",
            location="Nashik",
            approval_status="approved",
        )

    def test_farmer_cannot_add_items_to_cart(self):
        self.client.force_authenticate(user=self.farmer)

        response = self.client.post(
            "/api/cart-items/",
            {"product": self.product.id, "quantity": 2},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_consumer_checkout_creates_order_and_reduces_stock(self):
        self.client.force_authenticate(user=self.consumer)

        add_response = self.client.post(
            "/api/cart-items/",
            {"product": self.product.id, "quantity": 3},
            format="json",
        )
        self.assertEqual(add_response.status_code, status.HTTP_201_CREATED)

        checkout_response = self.client.post(
            "/api/carts/checkout/",
            {"delivery_address": "12 Market Road, Nashik, Maharashtra"},
            format="json",
        )

        self.assertEqual(checkout_response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(user=self.consumer)
        self.assertEqual(order.total_amount, 114)
        self.assertEqual(order.items.count(), 1)

        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 7)
        self.assertFalse(CartItem.objects.filter(cart__user=self.consumer).exists())

    def test_checkout_with_empty_cart_returns_validation_error(self):
        self.client.force_authenticate(user=self.consumer)

        response = self.client.post(
            "/api/carts/checkout/",
            {"delivery_address": "12 Market Road, Nashik, Maharashtra"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(ALLOW_DEMO_PAYMENTS=True)
    def test_demo_checkout_payment_order_and_verification(self):
        self.client.force_authenticate(user=self.consumer)
        self.client.post("/api/cart-items/", {"product": self.product.id, "quantity": 2}, format="json")
        checkout_response = self.client.post(
            "/api/carts/checkout/",
            {"delivery_address": "12 Market Road, Nashik, Maharashtra"},
            format="json",
        )
        order_id = checkout_response.data["order"]["id"]

        create_payment_response = self.client.post(
            f"/api/orders/{order_id}/create-payment-order/",
            format="json",
        )
        self.assertEqual(create_payment_response.status_code, status.HTTP_200_OK)
        self.assertTrue(create_payment_response.data["is_demo"])
        self.assertTrue(create_payment_response.data["razorpay_order_id"].startswith("order_demo_"))

        verify_response = self.client.post(
            f"/api/orders/{order_id}/verify-payment/",
            {
                "razorpay_order_id": create_payment_response.data["razorpay_order_id"],
                "razorpay_payment_id": f"pay_demo_{order_id}",
                "razorpay_signature": "demo_signature",
            },
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        self.assertEqual(verify_response.data["order_status"], "confirmed")
        self.assertEqual(verify_response.data["payment_status"], "paid")

    def test_cancelling_pending_order_releases_stock_once(self):
        self.client.force_authenticate(user=self.consumer)
        self.client.post("/api/cart-items/", {"product": self.product.id, "quantity": 3}, format="json")
        checkout_response = self.client.post(
            "/api/carts/checkout/",
            {"delivery_address": "12 Market Road, Nashik, Maharashtra"},
            format="json",
        )
        order_id = checkout_response.data["order"]["id"]

        cancel_response = self.client.post(f"/api/orders/{order_id}/cancel/", format="json")
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 10)

        repeat_response = self.client.post(f"/api/orders/{order_id}/cancel/", format="json")
        self.assertEqual(repeat_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 10)

    @override_settings(RAZORPAY_WEBHOOK_SECRET="test-webhook-secret")
    def test_signed_webhook_confirms_payment_once(self):
        self.client.force_authenticate(user=self.consumer)
        self.client.post("/api/cart-items/", {"product": self.product.id, "quantity": 2}, format="json")
        checkout_response = self.client.post(
            "/api/carts/checkout/",
            {"delivery_address": "12 Market Road, Nashik, Maharashtra"},
            format="json",
        )
        order = Order.objects.get(pk=checkout_response.data["order"]["id"])
        Payment.objects.create(order=order, amount=order.total_amount, razorpay_order_id="order_test_123")
        payload = {
            "event": "payment.captured",
            "payload": {"payment": {"entity": {"id": "pay_test_123", "order_id": "order_test_123"}}},
        }
        raw_body = json.dumps(payload).encode()
        signature = hmac.new(b"test-webhook-secret", raw_body, hashlib.sha256).hexdigest()

        response = self.client.generic(
            "POST",
            "/api/orders/razorpay-webhook/",
            data=raw_body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=signature,
            HTTP_X_RAZORPAY_EVENT_ID="event_test_123",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["handled"])

        duplicate_response = self.client.generic(
            "POST",
            "/api/orders/razorpay-webhook/",
            data=raw_body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=signature,
            HTTP_X_RAZORPAY_EVENT_ID="event_test_123",
        )
        self.assertEqual(duplicate_response.status_code, status.HTTP_200_OK)
        self.assertTrue(duplicate_response.data["duplicate"])
        self.assertEqual(PaymentWebhookEvent.objects.count(), 1)
        order.refresh_from_db()
        self.assertEqual(order.status, "confirmed")

    @override_settings(RAZORPAY_WEBHOOK_SECRET="test-webhook-secret")
    def test_webhook_rejects_invalid_signature_and_releases_on_failure(self):
        self.client.force_authenticate(user=self.consumer)
        self.client.post("/api/cart-items/", {"product": self.product.id, "quantity": 2}, format="json")
        checkout_response = self.client.post("/api/carts/checkout/", {"delivery_address": "12 Market Road, Nashik, Maharashtra"}, format="json")
        order = Order.objects.get(pk=checkout_response.data["order"]["id"])
        Payment.objects.create(order=order, amount=order.total_amount, razorpay_order_id="order_failure_123")
        payload = {"event": "payment.failed", "payload": {"payment": {"entity": {"id": "pay_failed", "order_id": "order_failure_123"}}}}
        raw_body = json.dumps(payload).encode()
        invalid = self.client.generic("POST", "/api/orders/razorpay-webhook/", data=raw_body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE="invalid")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        signature = hmac.new(b"test-webhook-secret", raw_body, hashlib.sha256).hexdigest()
        failed = self.client.generic("POST", "/api/orders/razorpay-webhook/", data=raw_body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE=signature, HTTP_X_RAZORPAY_EVENT_ID="event_failed_123")
        self.assertEqual(failed.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(order.status, "cancelled")
        self.assertEqual(self.product.quantity, 10)


class FarmerOrderManagementTests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(username="farmer", password="SafePass123!", role="farmer")
        self.other_farmer = User.objects.create_user(username="other-farmer", password="SafePass123!", role="farmer")
        self.consumer = User.objects.create_user(username="buyer", password="SafePass123!", role="consumer")
        self.other_consumer = User.objects.create_user(username="other-buyer", password="SafePass123!", role="consumer")
        self.product = Product.objects.create(farmer=self.farmer, name="Farmer Mangoes", category="Fruit", description="Sweet mangoes from the farm.", price="50.00", quantity=20, unit="kg", location="Nashik", approval_status="approved")
        self.order = Order.objects.create(user=self.consumer, status="confirmed", total_amount="100.00", delivery_address="12 Market Road, Nashik, Maharashtra")
        self.item = self.order.items.create(product=self.product, product_name=self.product.name, unit_price="50.00", quantity=2, subtotal="100.00")

    def test_farmer_can_see_only_owned_order_items(self):
        other_product = Product.objects.create(farmer=self.other_farmer, name="Other Oranges", category="Fruit", description="Fresh oranges from another farm.", price="40.00", quantity=10, unit="kg", location="Pune", approval_status="approved")
        other_order = Order.objects.create(user=self.other_consumer, status="confirmed", total_amount="40.00", delivery_address="1 Orchard Lane, Pune, Maharashtra")
        other_order.items.create(product=other_product, product_name=other_product.name, unit_price="40.00", quantity=1, subtotal="40.00")
        self.client.force_authenticate(self.farmer)
        response = self.client.get("/api/farmer/order-items/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.item.id)
        self.assertNotIn("email", response.data["results"][0])

    def test_consumer_can_only_view_own_orders(self):
        other_order = Order.objects.create(user=self.other_consumer, total_amount="1.00", delivery_address="1 Orchard Lane, Pune, Maharashtra")
        self.client.force_authenticate(self.consumer)
        response = self.client.get(f"/api/orders/{other_order.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_valid_farmer_transitions_record_tracking(self):
        self.client.force_authenticate(self.farmer)
        processing = self.client.post(f"/api/farmer/orders/{self.order.id}/transition/", {"status": "processing"}, format="json")
        self.assertEqual(processing.status_code, status.HTTP_200_OK)
        shipped = self.client.post(f"/api/farmer/orders/{self.order.id}/transition/", {"status": "shipped", "courier_name": "BlueDart", "tracking_id": "BD123"}, format="json")
        self.assertEqual(shipped.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(shipped.data["shipped_at"])
        delivered = self.client.post(f"/api/farmer/orders/{self.order.id}/transition/", {"status": "delivered"}, format="json")
        self.assertEqual(delivered.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(delivered.data["delivered_at"])

    def test_invalid_transition_or_mixed_order_is_forbidden(self):
        self.client.force_authenticate(self.farmer)
        invalid = self.client.post(f"/api/farmer/orders/{self.order.id}/transition/", {"status": "shipped"}, format="json")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        mixed_product = Product.objects.create(farmer=self.other_farmer, name="Mixed Crop", category="Fruit", description="Another farmer product in this order.", price="20.00", quantity=10, unit="kg", location="Pune", approval_status="approved")
        self.order.items.create(product=mixed_product, product_name=mixed_product.name, unit_price="20.00", quantity=1, subtotal="20.00")
        forbidden = self.client.post(f"/api/farmer/orders/{self.order.id}/transition/", {"status": "processing"}, format="json")
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)


class ExpiredReservationCommandTests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(username="cleanup-farmer", password="SafePass123!", role="farmer")
        self.consumer = User.objects.create_user(username="cleanup-buyer", password="SafePass123!", role="consumer")
        self.product = Product.objects.create(farmer=self.farmer, name="Cleanup Tomatoes", category="Vegetables", description="Tomatoes reserved for cleanup tests.", price="10.00", quantity=5, unit="kg", location="Nashik", approval_status="approved")

    def _order(self, *, status="pending", expires_at=None):
        order = Order.objects.create(user=self.consumer, status=status, total_amount="20.00", delivery_address="12 Market Road, Nashik, Maharashtra", reservation_expires_at=expires_at)
        order.items.create(product=self.product, product_name=self.product.name, unit_price="10.00", quantity=2, subtotal="20.00")
        self.product.quantity -= 2
        self.product.save(update_fields=["quantity", "updated_at"])
        return order

    def test_command_releases_expired_pending_order_once(self):
        order = self._order(expires_at=timezone.now() - timedelta(minutes=1))
        call_command("release_expired_reservations")
        order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertTrue(order.stock_released)
        self.assertEqual(order.status, "cancelled")
        self.assertEqual(self.product.quantity, 5)
        call_command("release_expired_reservations")
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 5)

    def test_command_leaves_paid_or_confirmed_orders_untouched(self):
        order = self._order(status="confirmed", expires_at=timezone.now() - timedelta(minutes=1))
        call_command("release_expired_reservations")
        order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertFalse(order.stock_released)
        self.assertEqual(order.status, "confirmed")
        self.assertEqual(self.product.quantity, 3)
