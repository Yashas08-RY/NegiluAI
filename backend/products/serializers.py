from django.db.models import Avg
from rest_framework import serializers
from .models import Product, ProductImage, Wishlist, Review
from users.serializers import FarmerDetailSerializer


class ProductImageSerializer(serializers.ModelSerializer):
    """Serialize product image uploads."""

    class Meta:
        model = ProductImage
        fields = (
            "id",
            "product",
            "image",
            "alt_text",
            "is_primary",
            "created_at",
        )
        read_only_fields = ("id", "product", "created_at")

    def validate_image(self, value):
        max_file_size = 5 * 1024 * 1024  # 5 MB

        if value.size > max_file_size:
            raise serializers.ValidationError(
                "Image size must not exceed 5 MB."
            )

        return value


class ProductSerializer(serializers.ModelSerializer):
    farmer = FarmerDetailSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "farmer", "images", "name", "category", "description",
            "price", "unit", "quantity", "location", "is_available",
            "approval_status", "moderation_note",
            "average_rating", "review_count",
            "created_at", "updated_at",
        ]
        read_only_fields = (
            "id", "farmer", "approval_status", "moderation_note",
            "created_at", "updated_at",
        )

    def get_average_rating(self, obj):
        agg = obj.reviews.aggregate(Avg("rating"))
        val = agg["rating__avg"]
        return round(val, 1) if val is not None else 0.0

    def get_review_count(self, obj):
        return obj.reviews.count()

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError(
                "Product name must contain at least 2 characters."
            )
        return value

    def validate_description(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError(
                "Description must contain at least 10 characters."
            )
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value


class WishlistSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source="product", read_only=True)

    class Meta:
        model = Wishlist
        fields = ("id", "product", "product_details", "created_at")
        read_only_fields = ("id", "created_at")


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = ("id", "product", "user", "user_name", "rating", "comment", "created_at")
        read_only_fields = ("id", "user", "created_at")

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
