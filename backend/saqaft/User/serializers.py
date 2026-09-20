from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import OTPVerification
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)

    def validate(self, data):
        try:
            validate_password(data["password"], User(username=data["username"], email=data["email"]))
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages})
        return data

    password = serializers.CharField(write_only=True,min_length=8)
    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password"]
    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],)

        user.is_active = False
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True
    )

    def validate(self, data):
        user = authenticate(
            username=data["username"],
            password=data["password"]
        )

        if user:
            data["user"] = user
            return data

        # authenticate() refuses an inactive account, so a correct password for an
        # unverified one lands here too. Tell those two apart, but only once the
        # password checks out — saying "this account is unverified" to someone who
        # got the password wrong would reveal which usernames exist.
        pending = User.objects.filter(
            username=data["username"],
            is_active=False
        ).first()

        if pending and pending.check_password(data["password"]):
            data["unverified"] = pending
            return data

        raise serializers.ValidationError(
            "Invalid username or password."
        )


class VerifyOTPSerializer(serializers.Serializer):
    username = serializers.CharField()
    otp = serializers.RegexField(r"^[0-9]{6}$")

    def validate(self, data):
        user = User.objects.filter(username=data["username"]).first()
        if not user:
            raise serializers.ValidationError("Invalid OTP.")
        if user.is_active:
            raise serializers.ValidationError("This account is already verified.")
        verification = OTPVerification.objects.filter(user=user, is_verified=False).order_by("-created_at").first()
        if not verification:
            raise serializers.ValidationError("Invalid OTP.")
        data["verification"] = verification
        data["user"] = user
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyResetOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(
        min_length=6,
        max_length=6
    )


class ResetPasswordSerializer(serializers.Serializer):
    otp = serializers.RegexField(r"^[0-9]{6}$")
    email = serializers.EmailField()
    new_password = serializers.CharField(
        write_only=True,
        min_length=8
    )
    def validate(self, data):
        user = User.objects.filter(email__iexact=data["email"]).first()
        try:
            validate_password(data["new_password"], user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"new_password": error.messages})
        return data
