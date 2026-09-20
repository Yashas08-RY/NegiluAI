from django.db import transaction

from .models import Product, ProductImage


@transaction.atomic
def create_product_image(*, product, validated_data):
    """Create an image and ensure a product has only one primary image."""

    locked_product = Product.objects.select_for_update().get(pk=product.pk)

    requested_primary = validated_data.pop("is_primary", False)
    has_existing_images = locked_product.images.exists()

    should_be_primary = requested_primary or not has_existing_images

    if should_be_primary:
        ProductImage.objects.filter(
            product=locked_product,
            is_primary=True,
        ).update(is_primary=False)

    return ProductImage.objects.create(
        product=locked_product,
        is_primary=should_be_primary,
        **validated_data,
    )


@transaction.atomic
def set_primary_product_image(*, image):
    """Set one image as the product's primary image."""

    Product.objects.select_for_update().get(pk=image.product_id)

    ProductImage.objects.filter(
        product_id=image.product_id,
        is_primary=True,
    ).exclude(pk=image.pk).update(is_primary=False)

    image.is_primary = True
    image.save(update_fields=["is_primary"])

    return image


@transaction.atomic
def delete_product_image(*, image):
    """Delete an image and reassign primary status if needed."""
    product_id = image.product_id
    was_primary = image.is_primary

    image.delete()

    if was_primary:
        next_image = ProductImage.objects.filter(product_id=product_id).first()
        if next_image:
            next_image.is_primary = True
            next_image.save(update_fields=["is_primary"])