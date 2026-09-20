

# Create your views here.
# It is A POST API endpoint.
#Which will:
#Accept user data
#Validate it
#Save to DB
#Return response
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils import timezone
from django.contrib.auth.hashers import check_password, make_password
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny,IsAuthenticated

from .models import PasswordResetCode, User
from .serializers import ChangePasswordSerializer, RegisterSerializer, UserProfileSerializer


# REGISTER API
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Honeypot: browsers never render this field. Bots that fill every
        # input are rejected before validation or account creation.
        if str(request.data.get("website", "")).strip():
            return Response({"detail": "Unable to create this account."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    


# LOGIN API
class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        identifier = str(request.data.get("username", "")).strip()
        password = request.data.get("password")

        user = authenticate(username=identifier, password=password)
        if user is None and "@" in identifier:
            user_by_email = User.objects.filter(email__iexact=identifier).first()
            if user_by_email:
                user = authenticate(username=user_by_email.username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            role = user.role
            if (user.is_staff or user.is_superuser) and not role:
                role = "admin"
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "username": user.username,
                    "email": user.email,
                    "role": role,
                }
            })

        return Response(
            {"error": "Invalid credentials. Please check your username and password."},
            status=status.HTTP_400_BAD_REQUEST
        )

# Adding Profile API
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"message": "Password updated successfully."})


class SendPasswordResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email__iexact=email).first()

        # Do not reveal whether an account exists for an email address.
        response = {"message": "If an account exists for this email, a verification code has been sent."}
        if not user:
            return Response(response)

        recent_count = PasswordResetCode.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(hours=1),
        ).count()
        if recent_count >= 5:
            return Response({"detail": "Too many reset requests. Please try again in one hour."}, status=429)

        PasswordResetCode.objects.filter(user=user, consumed_at__isnull=True).update(consumed_at=timezone.now())
        code = f"{secrets.randbelow(1_000_000):06d}"
        PasswordResetCode.objects.create(
            user=user,
            code_hash=make_password(code),
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        try:
            send_mail(
                subject="ನೇಗಿಲುai password reset code",
                message=f"Your ನೇಗಿಲುai password reset code is {code}. It expires in 10 minutes.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            return Response({"detail": "Unable to send the verification email. Please try again later."}, status=503)
        return Response(response)


class VerifyPasswordResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        code = str(request.data.get("code", "")).strip()
        record = PasswordResetCode.objects.filter(
            user__email__iexact=email,
            consumed_at__isnull=True,
        ).select_related("user").first()
        if not record or record.is_expired or record.attempts >= 5:
            return Response({"detail": "The verification code is invalid or expired."}, status=400)

        record.attempts += 1
        if not check_password(code, record.code_hash):
            record.save(update_fields=["attempts"])
            return Response({"detail": "The verification code is invalid or expired."}, status=400)

        record.verified_at = timezone.now()
        record.reset_token = secrets.token_urlsafe(32)
        record.save(update_fields=["attempts", "verified_at", "reset_token"])
        return Response({"reset_token": record.reset_token})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        token = str(request.data.get("reset_token", "")).strip()
        password = request.data.get("password", "")
        record = PasswordResetCode.objects.filter(
            user__email__iexact=email,
            reset_token=token,
            verified_at__isnull=False,
            consumed_at__isnull=True,
        ).select_related("user").first()
        if not record or record.is_expired:
            return Response({"detail": "The password reset session is invalid or expired."}, status=400)

        try:
            validate_password(password, user=record.user)
        except DjangoValidationError as error:
            return Response({"password": list(error.messages)}, status=400)
        record.user.set_password(password)
        record.user.save(update_fields=["password"])
        record.consumed_at = timezone.now()
        record.save(update_fields=["consumed_at"])
        return Response({"message": "Password updated successfully."})
