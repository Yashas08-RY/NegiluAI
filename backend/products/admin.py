from django.contrib import admin
from .models import Product, ProductImage, Wishlist, Review


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id", "name", "farmer", "category",
        "price", "quantity", "is_available", "created_at",
    )
    list_filter = ("category", "is_available", "created_at")
    search_fields = ("name", "description", "location", "farmer__username")
    list_select_related = ("farmer",)
    readonly_fields = ("created_at", "updated_at")

    inlines = [ProductImageInline]


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "product", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "product__name")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("product__name", "user__username", "comment")
