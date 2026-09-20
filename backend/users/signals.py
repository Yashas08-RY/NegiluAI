from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import FarmerProfile, User


@receiver(post_save, sender=User)
def create_farmer_profile(sender, instance, created, **kwargs):
    """Auto-create a FarmerProfile when a farmer account is created."""
    if created and instance.role == "farmer":
        FarmerProfile.objects.get_or_create(user=instance)
