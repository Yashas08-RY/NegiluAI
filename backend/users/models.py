from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    ROLE_CHOICES = (
        ('farmer', 'Farmer'),
        ('consumer', 'Consumer'),
        ('admin', 'Admin'),
    )

    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

class FarmerProfile(models.Model):
    """Extended profile for farmer accounts."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="farmer_profile",
    )
    farm_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    district = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    village = models.CharField(max_length=100, blank=True)
    profile_picture = models.ImageField(
        upload_to="profiles/%Y/%m/",
        blank=True,
        null=True,
    )
    aadhaar_verified = models.BooleanField(default=False)
    organic_certified = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s farm profile"


class PasswordResetCode(models.Model):
    """Short-lived, single-use password-reset verification code."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_codes")
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    verified_at = models.DateTimeField(null=True, blank=True)
    reset_token = models.CharField(max_length=64, null=True, blank=True, unique=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at
