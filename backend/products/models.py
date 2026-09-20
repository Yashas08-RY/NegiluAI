from django.db import models
from django.conf import settings
from django.db.models import Q

class Product(models.Model):

    APPROVAL_CHOICES = [
        ("pending", "Pending review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    CATEGORY_CHOICES = [
        ("Vegetables", "Vegetables"),
        ("Fruits", "Fruits"),
        ("Grains", "Grains"),
        ("Pulses", "Pulses"),
        ("Spices", "Spices"),
        ("Plantation", "Plantation"),
        ("Fibre", "Fibre"),
        ("Others", "Others"),
    ]

    farmer = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE
)
    name = models.CharField(max_length=100)

    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default="Others"
    )

    description = models.TextField()

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    quantity = models.PositiveIntegerField()

    UNIT_CHOICES = [
        ("kg", "Kilogram"),
        ("qtl", "Quintal"),
        ("dozen", "Dozen"),
        ("piece", "Piece"),
        ("bundle", "Bundle"),
    ]

    unit = models.CharField(
        max_length=20,
        choices=UNIT_CHOICES,
        default="kg",
    )

    location = models.CharField(
        max_length=100,
        default="Unknown"
    )

    is_available = models.BooleanField(default=True)
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_CHOICES,
        default="pending",
    )
    moderation_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class ProductImage(models.Model):
    """A product can have multiple images, with one primary image."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(
        upload_to="products/%Y/%m/%d/",
    )
    alt_text = models.CharField(
        max_length=200,
        blank=True,
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-is_primary", "created_at")
        constraints = [
            models.UniqueConstraint(
                fields=["product"],
                condition=Q(is_primary=True),
                name="one_primary_image_per_product",
            )
        ]

    def __str__(self):
        return f"Image for {self.product.name}"


class Wishlist(models.Model):
    """Product wishlist for authenticated users."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="wishlisted_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="unique_user_product_wishlist",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"


class Review(models.Model):
    """Reviews and ratings left by buyers for produce."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField(default=5)  # 1 to 5
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["product", "user"],
                name="one_review_per_user_per_product",
            )
        ]

    def __str__(self):
        return f"Review {self.rating}★ by {self.user.username} for {self.product.name}"

