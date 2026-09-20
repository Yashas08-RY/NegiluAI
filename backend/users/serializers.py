#Takes input from user (username, password, role)
#Saves it to database
#Uses create_user() → password is hashed 🔐

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import User, FarmerProfile


class RegisterSerializer(serializers.ModelSerializer):
    farmer_profile = serializers.DictField(required=False, write_only=True)
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'role', 'first_name', 'last_name',
            'farmer_profile',
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        farmer_data = validated_data.pop("farmer_profile", None)
        if validated_data.get("role") == "farmer" and not farmer_data:
            farmer_data = {}
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],  
            password=validated_data['password'],
            role=validated_data['role'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        if user.role == "farmer":
            FarmerProfile.objects.update_or_create(
                user=user,
                defaults={
                    "farm_name": farmer_data.get("farmName", ""),
                    "phone": farmer_data.get("phone", ""),
                    "district": farmer_data.get("district", ""),
                    "state": farmer_data.get("state", ""),
                    "village": farmer_data.get("village", ""),
                },
            )
        return user

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages)
        return value

    def validate_role(self, value):
        if value == "admin":
            raise serializers.ValidationError("Admin accounts must be created by an administrator.")
        return value

class FarmerProfileSerializer(serializers.ModelSerializer):
    """Serialize farmer profile for nesting inside product responses."""

    class Meta:
        model = FarmerProfile
        fields = (
            "farm_name",
            "phone",
            "district",
            "state",
            "village",
            "profile_picture",
            "aadhaar_verified",
            "organic_certified",
            "is_verified",
            "bio",
        )
        read_only_fields = fields


class FarmerDetailSerializer(serializers.ModelSerializer):
    """Serialize farmer user with their profile for product listings."""

    farmer_profile = FarmerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "farmer_profile",
        )
        read_only_fields = fields


class FarmerProfileUpdateSerializer(serializers.ModelSerializer):
    """Fields a farmer may update without changing verification decisions."""

    class Meta:
        model = FarmerProfile
        fields = (
            "farm_name", "phone", "district", "state", "village",
            "organic_certified", "bio",
        )


class UserProfileSerializer(serializers.ModelSerializer):
    farmer_profile = FarmerProfileUpdateSerializer(required=False)
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "username", "email", "first_name", "last_name", "role",
            "is_staff", "is_superuser", "farmer_profile",
        )
        read_only_fields = ("role", "is_staff", "is_superuser")

    def validate_email(self, value):
        existing = User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def update(self, instance, validated_data):
        farmer_data = validated_data.pop("farmer_profile", None)
        instance = super().update(instance, validated_data)

        if farmer_data is not None and instance.role == "farmer":
            profile, _ = FarmerProfile.objects.get_or_create(user=instance)
            for field, value in farmer_data.items():
                setattr(profile, field, value)
            profile.save()

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"new_password": error.messages})
        return attrs
