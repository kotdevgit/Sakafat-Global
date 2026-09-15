from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import  RegisterView,LoginView,VerifyOTPView,ForgotPasswordView,VerifyResetOTPView,ResetPasswordView, MeView, ResendOTPView

urlpatterns = [
    path("me/", MeView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("resend_otp/", ResendOTPView.as_view()),
    path("register/", RegisterView.as_view()),
    path("login/",LoginView.as_view()),
    path("verify_otp/",VerifyOTPView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view()),
    path("verify-reset-otp/", VerifyResetOTPView.as_view()),
    path("reset-password/", ResetPasswordView.as_view()),
]