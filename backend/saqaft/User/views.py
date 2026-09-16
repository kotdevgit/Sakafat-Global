from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.response import Response
from rest_framework import generics
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
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

OTP_TTL_MINUTES = 1
MAX_OTP_ATTEMPTS = 5
INVALID_RESET_CODE = "Invalid or expired reset code."


def _revoke_refresh_tokens(user):
    """Signs the account out everywhere; a stolen token must not survive a reset."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)

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
                OTPVerification.objects.create(user=user, otp=otp,)
                send_mail(
                    subject="Email Verification Code",
                    message=f"Your verification code is: {otp}",
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

        # The password was right but the account was never verified. Answer with a
        # code the site can act on, so it can send them to finish verifying rather
        # than showing a misleading "invalid username or password".
        unverified = serializer.validated_data.get("unverified")
        if unverified:
            return Response(
                {
                    "code": "ACCOUNT_NOT_VERIFIED",
                    "username": unverified.username,
                    "error": "Your email is not verified yet. Enter the code we sent you.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

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
        verification = serializer.validated_data["verification"]
        with transaction.atomic():
            record = OTPVerification.objects.select_for_update().get(id=verification.id)

            if record.created_at < timezone.now() - timedelta(minutes=10):
                return Response(
                    {
                        "error": "This verification code has expired. Request a new code."
                    },
                    status=400
                )

            if record.attempts >= 5:
                return Response(
                    {
                        "error": "Too many incorrect codes. Request a new code."
                    },
                    status=400
                )

            if not secrets.compare_digest(
                record.otp,
                serializer.validated_data["otp"]
            ):
                record.attempts += 1
                record.save(update_fields=["attempts"])

                return Response(
                    {"error": "Invalid verification code."},
                    status=400
                )

            record.is_verified = True
            record.save(update_fields=["is_verified"])

            user = record.user
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
        user = User.objects.filter(email__iexact=email).first()

        if user:
            recent = PasswordResetOTP.objects.filter(
                user=user, created_at__gte=timezone.now() - timedelta(seconds=60)
            ).exists()
            if not recent:
                try:
                    with transaction.atomic():
                        PasswordResetOTP.objects.filter(user=user, is_verified=False).delete()
                        otp = str(secrets.randbelow(900000) + 100000)
                        PasswordResetOTP.objects.create(user=user, otp=otp)
                        send_mail(
                            subject="Password Reset OTP",
                            message=f"Your password reset code is: {otp}\nThis code expires in {OTP_TTL_MINUTES} minutes.",
                            from_email=None,
                            recipient_list=[user.email],
                        )
                except (OSError, SMTPException):
                    return Response(
                        {"error": "We couldn’t send your reset email. Please try again."},
                        status=503,
                    )

        # The same reply is sent whether or not the address has an account, so the
        # endpoint cannot be used to discover which emails are registered.
        return Response(
            {"message": "If an account exists for that email, a reset code has been sent."},
            status=status.HTTP_200_OK,
        )


def _claim_reset_otp(user, supplied_otp):
    """
    Returns the matching unexpired reset OTP, or an error response.

    Wrong guesses are counted so a six-digit code cannot be brute forced.
    """
    record = (
        PasswordResetOTP.objects.select_for_update()
        .filter(user=user, created_at__gte=timezone.now() - timedelta(minutes=OTP_TTL_MINUTES))
        .order_by("-created_at")
        .first()
    )
    if not record:
        return None, Response({"error": INVALID_RESET_CODE}, status=400)
    if record.attempts >= MAX_OTP_ATTEMPTS:
        return None, Response(
            {"error": "Too many incorrect codes. Request a new code."}, status=400
        )
    if not secrets.compare_digest(record.otp, supplied_otp):
        record.attempts += 1
        record.save(update_fields=["attempts"])
        return None, Response({"error": INVALID_RESET_CODE}, status=400)
    return record, None


class VerifyResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyResetOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
            if not user:
                # Matches the wrong-code reply so unknown emails are indistinguishable.
                return Response({"error": INVALID_RESET_CODE}, status=400)

            record, error = _claim_reset_otp(user, serializer.validated_data["otp"])
            if error:
                return error

            record.is_verified = True
            record.save(update_fields=["is_verified"])

        return Response({"message": "OTP verified successfully."}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
            if not user:
                return Response({"error": INVALID_RESET_CODE}, status=400)

            # The code is checked here rather than trusting an earlier verify call, so the
            # single-step form works and a stale "verified" record cannot be replayed.
            record, error = _claim_reset_otp(user, serializer.validated_data["otp"])
            if error:
                return error

            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=["password"])
            PasswordResetOTP.objects.filter(user=user).delete()
            _revoke_refresh_tokens(user)

        return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)
