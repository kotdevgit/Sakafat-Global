from datetime import timedelta
from smtplib import SMTPException
from unittest.mock import patch
from django.contrib.auth.models import User
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from .models import OTPVerification, PasswordResetOTP
from .views import OTP_TTL_MINUTES


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AuthenticationFlowTests(APITestCase):
    credentials = {"username": "qa_member", "email": "qa@example.test", "password": "River!Canvas47Sky"}

    def register(self):
        response = self.client.post('/api/register/', self.credentials)
        self.assertEqual(response.status_code, 201, response.data)
        return User.objects.get(username=self.credentials['username'])

    def test_registration_verification_login_and_authenticated_identity(self):
        user = self.register()
        self.assertFalse(user.is_active)
        self.assertEqual(len(mail.outbox), 1)
        otp = OTPVerification.objects.get(user=user).otp
        self.assertIn(otp, mail.outbox[0].body)
        login = {k: self.credentials[k] for k in ('username', 'password')}
        self.assertEqual(self.client.post('/api/login/', login).status_code, 400)
        self.assertEqual(self.client.post('/api/verify_otp/', {'username': user.username, 'otp': otp}).status_code, 200)
        response = self.client.post('/api/login/', login)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/me/').status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])
        self.assertEqual(self.client.get('/api/me/').data['username'], user.username)
        user.is_active = False
        user.save()
        self.assertEqual(self.client.get('/api/me/').status_code, 401)

    def test_duplicate_email_and_password_validation(self):
        self.register()
        data = {**self.credentials, 'username': 'another', 'email': 'QA@EXAMPLE.TEST'}
        self.assertEqual(self.client.post('/api/register/', data).status_code, 400)
        data.update(username='weak', email='weak@example.test', password='12345678')
        self.assertEqual(self.client.post('/api/register/', data).status_code, 400)

    def test_expiry_attempt_limit_and_resend(self):
        user = self.register()
        record = OTPVerification.objects.get(user=user)
        for _ in range(5):
            self.assertEqual(self.client.post('/api/verify_otp/', {'username': user.username, 'otp': '000000'}).status_code, 400)
        self.assertEqual(self.client.post('/api/verify_otp/', {'username': user.username, 'otp': record.otp}).status_code, 400)
        self.assertEqual(self.client.post('/api/resend_otp/', {'username': user.username}).status_code, 429)
        OTPVerification.objects.filter(pk=record.pk).update(created_at=timezone.now()-timedelta(minutes=11))
        self.assertEqual(self.client.post('/api/verify_otp/', {'username': user.username, 'otp': record.otp}).status_code, 400)
        self.assertEqual(self.client.post('/api/resend_otp/', {'username': user.username}).status_code, 200)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(OTPVerification.objects.get(user=user).attempts, 0)

    @patch('User.views.send_mail', side_effect=SMTPException('unavailable'))
    def test_mail_failure_does_not_leave_unusable_registration(self, send):
        self.assertEqual(self.client.post('/api/register/', self.credentials).status_code, 503)
        self.assertFalse(User.objects.filter(username=self.credentials['username']).exists())

    def test_verified_reset_flag_alone_cannot_change_password(self):
        user = self.register()
        PasswordResetOTP.objects.create(user=user, otp='123456', is_verified=True)
        response = self.client.post('/api/reset-password/', {'email': user.email, 'new_password': 'Changed!Pass293'})
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertTrue(user.check_password(self.credentials['password']))


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetSecurityTests(APITestCase):
    """Covers the reset flow: it must work, and must not leak or be brute forced."""

    forgot_url = "/api/forgot-password/"
    verify_url = "/api/verify-reset-otp/"
    reset_url = "/api/reset-password/"
    email = "victim@example.test"
    old_password = "old-example-password"
    new_password = "new-example-password"

    def setUp(self):
        self.user = User.objects.create_user("victim", self.email, self.old_password)

    def request_code(self):
        self.client.post(self.forgot_url, {"email": self.email})
        return PasswordResetOTP.objects.filter(user=self.user).latest("created_at").otp

    def test_reset_works_in_the_single_step_the_form_uses(self):
        otp = self.request_code()

        response = self.client.post(self.reset_url, {
            "email": self.email, "otp": otp, "new_password": self.new_password,
        })

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))

    def test_reset_still_works_after_a_separate_verify_call(self):
        otp = self.request_code()

        self.assertEqual(self.client.post(self.verify_url, {"email": self.email, "otp": otp}).status_code, 200)
        response = self.client.post(self.reset_url, {
            "email": self.email, "otp": otp, "new_password": self.new_password,
        })

        self.assertEqual(response.status_code, 200)

    def test_unknown_email_is_indistinguishable_from_a_known_one(self):
        known = self.client.post(self.forgot_url, {"email": self.email})
        unknown = self.client.post(self.forgot_url, {"email": "nobody@example.test"})

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.json(), unknown.json())

    def test_unknown_email_on_verify_matches_a_wrong_code(self):
        self.request_code()
        unknown = self.client.post(self.verify_url, {"email": "nobody@example.test", "otp": "000000"})
        wrong = self.client.post(self.verify_url, {"email": self.email, "otp": "000000"})

        self.assertEqual(unknown.status_code, wrong.status_code)
        self.assertEqual(unknown.json(), wrong.json())

    def test_wrong_codes_are_capped(self):
        otp = self.request_code()
        wrong = "000000" if otp != "000000" else "111111"

        statuses = [
            self.client.post(self.verify_url, {"email": self.email, "otp": wrong}).json()["error"]
            for _ in range(6)
        ]

        self.assertIn("Too many incorrect codes. Request a new code.", statuses)
        # The correct code is refused too once the cap is hit.
        blocked = self.client.post(self.reset_url, {
            "email": self.email, "otp": otp, "new_password": self.new_password,
        })
        self.assertEqual(blocked.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.old_password))

    def test_expired_code_is_refused_at_both_steps(self):
        otp = self.request_code()
        PasswordResetOTP.objects.filter(user=self.user).update(
            created_at=timezone.now() - timedelta(minutes=OTP_TTL_MINUTES + 1)
        )

        self.assertEqual(self.client.post(self.verify_url, {"email": self.email, "otp": otp}).status_code, 400)
        self.assertEqual(self.client.post(self.reset_url, {
            "email": self.email, "otp": otp, "new_password": self.new_password,
        }).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.old_password))

    def test_codes_cannot_be_requested_in_a_tight_loop(self):
        self.client.post(self.forgot_url, {"email": self.email})
        self.client.post(self.forgot_url, {"email": self.email})

        self.assertEqual(PasswordResetOTP.objects.filter(user=self.user).count(), 1)

    def test_used_code_cannot_be_replayed(self):
        otp = self.request_code()
        self.client.post(self.reset_url, {"email": self.email, "otp": otp, "new_password": self.new_password})

        replay = self.client.post(self.reset_url, {
            "email": self.email, "otp": otp, "new_password": "another-example-password",
        })

        self.assertEqual(replay.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))

    def test_reset_signs_existing_sessions_out(self):
        refresh = RefreshToken.for_user(self.user)
        otp = self.request_code()

        self.client.post(self.reset_url, {"email": self.email, "otp": otp, "new_password": self.new_password})

        with self.assertRaises(TokenError):
            refresh.check_blacklist()


class RefreshRotationTests(APITestCase):
    """Rotation must actually retire the old refresh token."""

    def test_rotated_refresh_token_is_rejected(self):
        user = User.objects.create_user("member", "member@example.test", "example-test-password")
        original = str(RefreshToken.for_user(user))

        rotated = self.client.post("/api/token/refresh/", {"refresh": original}, content_type="application/json")
        self.assertEqual(rotated.status_code, 200)
        self.assertIn("refresh", rotated.json())

        reused = self.client.post("/api/token/refresh/", {"refresh": original}, content_type="application/json")
        self.assertEqual(reused.status_code, 401)
