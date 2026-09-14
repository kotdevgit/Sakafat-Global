from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.response import Response
from rest_framework import generics
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import (AllowAny,)
from rest_framework.views import APIView
from django.core.mail import send_mail
from .models import OTPVerification,PasswordResetOTP
from .serializers import (LoginSerializer,RegisterSerializer, VerifyOTPSerializer,
                          ForgotPasswordSerializer,VerifyResetOTPSerializer,ResetPasswordSerializer)

import random

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self,request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user=serializer.validated_data["user"]

        otp = str(random.randint(100000,999999))

        OTPVerification.objects.filter(user=user, is_verified=False).delete()
        OTPVerification.objects.create(user=user ,otp=otp)

        send_mail(
            subject="Login Verification Code",
            message=f"Your verification code is : {otp} ",
            from_email=None,
            recipient_list=[user.email],
        )

        return Response(
            {
                "message": "OTP sent to your email.",
                "username": user.username
            },
            status=status.HTTP_200_OK
        )

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        otp = serializer.validated_data["otp"]

        otp_record = OTPVerification.objects.filter(
            user=user,
            otp=otp,
            is_verified=False
        ).order_by("-created_at").first()

        if not otp_record:
            return Response(
                {
                    "error": "Invalid OTP."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_record.is_verified = True
        otp_record.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email
                }
            },
            status=status.HTTP_200_OK
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "No account found with this email."},
                status=status.HTTP_404_NOT_FOUND
            )

        otp = str(random.randint(100000, 999999))

        PasswordResetOTP.objects.filter(
            user=user,
            is_verified=False
        ).delete()

        PasswordResetOTP.objects.create(
            user=user,
            otp=otp
        )

        send_mail(
            subject="Password Reset OTP",
            message=f"Your password reset OTP is: {otp}",
            from_email=None,
            recipient_list=[user.email],
        )

        return Response(
            {
                "message": "Password reset OTP sent to your email."
            },
            status=status.HTTP_200_OK
        )

class VerifyResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyResetOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            otp=otp,
            is_verified=False
        ).order_by("-created_at").first()

        if not otp_record:
            return Response(
                {"error": "Invalid OTP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_record.is_verified = True
        otp_record.save()

        return Response(
            {
                "message": "OTP verified successfully."
            },
            status=status.HTTP_200_OK
        )

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        new_password = serializer.validated_data["new_password"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist: 
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            is_verified=True
        ).order_by("-created_at").first()

        if not otp_record:
            return Response(
                {"error": "Please verify OTP first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        otp_record.delete()

        return Response(
            {
                "message": "Password reset successfully."
            },
            status=status.HTTP_200_OK
        )