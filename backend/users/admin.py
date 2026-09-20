from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import FarmerProfile, User


class FarmerProfileInline(admin.StackedInline):
    model = FarmerProfile
    can_delete = False
    verbose_name_plural = "Farmer Profile"
    fk_name = "user"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("ನೇಗಿಲುai", {"fields": ("role",)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("ನೇಗಿಲುai", {"fields": ("role",)}),
    )

    def get_inlines(self, request, obj=None):
        if obj and obj.role == "farmer":
            return [FarmerProfileInline]
        return []


@admin.register(FarmerProfile)
class FarmerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "farm_name", "district", "state", "is_verified", "organic_certified")
    list_filter = ("is_verified", "organic_certified", "aadhaar_verified", "state")
    search_fields = ("user__username", "farm_name", "district", "state", "village")
    readonly_fields = ("created_at", "updated_at")
