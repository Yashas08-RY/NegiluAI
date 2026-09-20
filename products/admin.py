from django.contrib import admin
from .models import Product


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