from django.urls import path
from .views import  RegisterView,LoginView,VerifyOTPView,ForgotPasswordView,VerifyResetOTPView,ResetPasswordView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/",LoginView.as_view()),
    path("verify_otp/",VerifyOTPView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view()),
    path("verify-reset-otp/", VerifyResetOTPView.as_view()),
    path("reset-password/", ResetPasswordView.as_view()),
] 