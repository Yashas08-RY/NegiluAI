from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    farmer = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "farmer", "name", "category", "description",
            "price", "quantity", "location", "is_available",
            "created_at", "updated_at",
        ]
        read_only_fields = ("id", "farmer", "created_at", "updated_at")

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
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value