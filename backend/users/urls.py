from django.urls import path
from .views import (
    RegisterView, LoginView, ProfileView, ChangePasswordView, SendPasswordResetOTPView,
    VerifyPasswordResetOTPView, ResetPasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('profile/', ProfileView.as_view()),
    path('profile/change-password/', ChangePasswordView.as_view()),
    path('auth/send-otp/', SendPasswordResetOTPView.as_view()),
    path('auth/verify-otp/', VerifyPasswordResetOTPView.as_view()),
    path('auth/reset-password/', ResetPasswordView.as_view()),
]
