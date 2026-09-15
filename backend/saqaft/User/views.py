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

import secrets
from datetime import timedelta
from smtplib import SMTPException
from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
User = get_user_model()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = serializer.save()
                otp = str(secrets.randbelow(900000) + 100000)
                OTPVerification.objects.create(user=user, otp=otp)
                send_mail(
                    subject="Email Verification Code",
                    message=f"Your verification code is: {otp}\nThis code expires in 10 minutes.",
                    from_email=None,
                    recipient_list=[user.email],
                )
        except (OSError, SMTPException):
            return Response({"error": "We couldn’t send your verification email. Please try again."}, status=503)
        return Response({"message": "Registration successful. OTP sent to your email.", "username": user.username}, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                }
            },
            status=status.HTTP_200_OK
        )

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        with transaction.atomic():
            record = OTPVerification.objects.select_for_update().filter(user=user, is_verified=False).order_by("-created_at").first()
            if not record or record.created_at < timezone.now() - timedelta(minutes=10):
                return Response({"error": "This verification code has expired. Request a new code."}, status=400)
            if record.attempts >= 5:
                return Response({"error": "Too many incorrect codes. Request a new code."}, status=400)
            if not secrets.compare_digest(record.otp, serializer.validated_data["otp"]):
                record.attempts += 1
                record.save(update_fields=["attempts"])
                return Response({"error": "Invalid verification code."}, status=400)
            record.is_verified = True
            record.save(update_fields=["is_verified"])
            user.is_active = True
            user.save(update_fields=["is_active"])
        return Response({"message": "OTP_VERIFIED"})


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        if not isinstance(username, str) or not username.strip():
            return Response({"error": "Enter your username to request a new code."}, status=400)
        user = User.objects.filter(username=username, is_active=False).first()
        if user:
            recent = OTPVerification.objects.filter(user=user, created_at__gte=timezone.now() - timedelta(seconds=60)).exists()
            if recent:
                return Response({"error": "Please wait a minute before requesting another code."}, status=429)
            try:
                with transaction.atomic():
                    User.objects.select_for_update().get(pk=user.pk)
                    OTPVerification.objects.filter(user=user, is_verified=False).delete()
                    otp = str(secrets.randbelow(900000) + 100000)
                    OTPVerification.objects.create(user=user, otp=otp)
                    send_mail("Email Verification Code", f"Your verification code is: {otp}\nThis code expires in 10 minutes.", None, [user.email])
            except (OSError, SMTPException):
                return Response({"error": "We couldn’t send your verification email. Please try again."}, status=503)
        return Response({"message": "If your account is awaiting verification, a new code has been sent."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"id": request.user.id, "username": request.user.username, "email": request.user.email})


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

        otp = str(secrets.randbelow(900000) + 100000)

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
            is_verified=True,
            otp=serializer.validated_data["otp"],
            created_at__gte=timezone.now() - timedelta(minutes=10),
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