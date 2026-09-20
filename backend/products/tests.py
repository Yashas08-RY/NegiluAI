from rest_framework import status
from rest_framework.test import APITestCase

from users.models import FarmerProfile, User
from orders.models import Order

from .models import Product


class ProductApiTests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username="farmer_one",
            password="SafePass123!",
            role="farmer",
        )
        self.consumer = User.objects.create_user(
            username="consumer_one",
            password="SafePass123!",
            role="consumer",
        )
        FarmerProfile.objects.filter(user=self.farmer).update(is_verified=True)

        self.product = Product.objects.create(
            farmer=self.farmer,
            name="Fresh Tomato",
            category="Vegetables",
            description="Fresh tomatoes harvested this morning.",
            price="38.00",
            quantity=100,
            unit="kg",
            location="Nashik, Maharashtra",
            approval_status="approved",
        )

    def test_anyone_can_view_product_list(self):
        response = self.client.get("/api/products/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Fresh Tomato")

    def test_consumer_cannot_create_product(self):
        self.client.force_authenticate(user=self.consumer)

        response = self.client.post(
            "/api/products/",
            {
                "name": "Illegal Listing",
                "category": "Vegetables",
                "description": "This listing must be rejected safely.",
                "price": "25.00",
                "quantity": 10,
                "unit": "kg",
                "location": "Nashik",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_farmer_can_create_product_and_becomes_owner(self):
        self.client.force_authenticate(user=self.farmer)

        response = self.client.post(
            "/api/products/",
            {
                "name": "Organic Onion",
                "category": "Vegetables",
                "description": "Fresh organic onions from our family farm.",
                "price": "32.00",
                "quantity": 80,
                "unit": "kg",
                "location": "Nashik",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        product = Product.objects.get(name="Organic Onion")
        self.assertEqual(product.farmer, self.farmer)
        self.assertEqual(product.approval_status, "pending")

    def test_pending_product_is_not_publicly_visible(self):
        Product.objects.create(
            farmer=self.farmer,
            name="Pending Potato",
            category="Vegetables",
            description="Awaiting platform approval before public sale.",
            price="25.00",
            quantity=20,
            location="Nashik",
        )

        response = self.client.get("/api/products/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_only_delivered_purchaser_can_review(self):
        self.client.force_authenticate(self.consumer)
        denied = self.client.post(f"/api/products/{self.product.id}/reviews/", {"rating": 5, "comment": "Excellent."}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        order = Order.objects.create(user=self.consumer, status="delivered", total_amount="38.00", delivery_address="12 Market Road, Nashik, Maharashtra")
        order.items.create(product=self.product, product_name=self.product.name, unit_price="38.00", quantity=1, subtotal="38.00")
        allowed = self.client.post(f"/api/products/{self.product.id}/reviews/", {"rating": 5, "comment": "Excellent."}, format="json")
        self.assertEqual(allowed.status_code, status.HTTP_201_CREATED)
