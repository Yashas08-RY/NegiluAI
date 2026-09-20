from rest_framework import status
from rest_framework.test import APITestCase

from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.utils import timezone

from .models import FarmerProfile, PasswordResetCode, User


class AuthenticationApiTests(APITestCase):
    def test_registration_honeypot_rejects_bots(self):
        response = self.client.post(
            "/api/register/",
            {
                "username": "bot_account",
                "email": "bot@example.com",
                "password": "SafePass123!",
                "role": "consumer",
                "website": "https://spam.example",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="bot_account").exists())

    def test_registration_persists_the_submitted_name(self):
        response = self.client.post(
            "/api/register/",
            {
                "username": "anita_naik",
                "email": "anita@example.com",
                "password": "SafePass123!",
                "role": "consumer",
                "first_name": "Anita",
                "last_name": "Naik",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="anita_naik")
        self.assertEqual(user.first_name, "Anita")
        self.assertEqual(user.last_name, "Naik")

    def test_farmer_can_register_and_profile_is_created(self):
        response = self.client.post(
            "/api/register/",
            {
                "username": "test_farmer",
                "email": "farmer@example.com",
                "password": "SafePass123!",
                "role": "farmer",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="test_farmer")
        self.assertTrue(FarmerProfile.objects.filter(user=user).exists())

    def test_user_can_login_and_access_profile(self):
        user = User.objects.create_user(
            username="test_consumer",
            email="consumer@example.com",
            password="SafePass123!",
            role="consumer",
        )

        login_response = self.client.post(
            "/api/login/",
            {
                "username": "test_consumer",
                "password": "SafePass123!",
            },
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )
        profile_response = self.client.get("/api/profile/")

        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["username"], user.username)

    def test_user_can_login_with_email(self):
        user = User.objects.create_user(
            username="email_login_user",
            email="email-login@example.com",
            password="SafePass123!",
            role="consumer",
        )
        response = self.client.post(
            "/api/login/",
            {"username": user.email, "password": "SafePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_farmer_registration_persists_profile_fields(self):
        response = self.client.post(
            "/api/register/",
            {
                "username": "profile_farmer",
                "email": "profile-farmer@example.com",
                "password": "SafePass123!",
                "role": "farmer",
                "farmer_profile": {"farmName": "Sunrise Farm", "phone": "9876543210", "district": "Kolar", "state": "Karnataka", "village": "Kolar"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FarmerProfile.objects.get(user__username="profile_farmer").farm_name, "Sunrise Farm")

    def test_public_registration_cannot_create_admin(self):
        response = self.client.post(
            "/api/register/",
            {"username": "fake_admin", "email": "fake-admin@example.com", "password": "SafePass123!", "role": "admin"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_requires_login(self):
        response = self.client.get("/api/profile/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_change_password(self):
        user = User.objects.create_user(username="password_user", password="OldSafePass123!", role="consumer")
        self.client.force_authenticate(user)
        response = self.client.post(
            "/api/profile/change-password/",
            {"current_password": "OldSafePass123!", "new_password": "NewSafePass123!", "confirm_password": "NewSafePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewSafePass123!"))

    def test_user_can_update_profile(self):
        user = User.objects.create_user(
            username="profile_user",
            email="profile@example.com",
            password="SafePass123!",
            role="consumer",
        )
        self.client.force_authenticate(user)

        response = self.client.patch(
            "/api/profile/",
            {"first_name": "Asha", "email": "asha@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.first_name, "Asha")
        self.assertEqual(user.email, "asha@example.com")

    def test_verified_otp_can_reset_password_once(self):
        user = User.objects.create_user(
            username="reset_user",
            email="reset@example.com",
            password="OldSafePass123!",
            role="consumer",
        )
        PasswordResetCode.objects.create(
            user=user,
            code_hash=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        verify_response = self.client.post(
            "/api/auth/verify-otp/",
            {"email": user.email, "code": "123456"},
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        reset_response = self.client.post(
            "/api/auth/reset-password/",
            {
                "email": user.email,
                "reset_token": verify_response.data["reset_token"],
                "password": "NewSafePass123!",
            },
            format="json",
        )
        self.assertEqual(reset_response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewSafePass123!"))

        repeated_response = self.client.post(
            "/api/auth/reset-password/",
            {
                "email": user.email,
                "reset_token": verify_response.data["reset_token"],
                "password": "AnotherSafePass123!",
            },
            format="json",
        )
        self.assertEqual(repeated_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_and_invalid_otp_are_rejected(self):
        user = User.objects.create_user(username="otp_user", email="otp@example.com", password="SafePass123!", role="consumer")
        expired = PasswordResetCode.objects.create(user=user, code_hash=make_password("123456"), expires_at=timezone.now() - timedelta(seconds=1))
        expired_response = self.client.post("/api/auth/verify-otp/", {"email": user.email, "code": "123456"}, format="json")
        self.assertEqual(expired_response.status_code, status.HTTP_400_BAD_REQUEST)
        expired.consumed_at = timezone.now()
        expired.save(update_fields=["consumed_at"])
        PasswordResetCode.objects.create(user=user, code_hash=make_password("123456"), expires_at=timezone.now() + timedelta(minutes=10))
        invalid_response = self.client.post("/api/auth/verify-otp/", {"email": user.email, "code": "000000"}, format="json")
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
