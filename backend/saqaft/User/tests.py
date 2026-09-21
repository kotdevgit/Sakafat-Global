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
        self.assertEqual(mail.outbox[0].alternatives[0][1], "text/html")
        self.assertIn(otp, mail.outbox[0].alternatives[0][0])
        self.assertIn("Sakafat Global", mail.outbox[0].alternatives[0][0])
        login = {k: self.credentials[k] for k in ('username', 'password')}
        # Signing in before verifying now says so, so the site can carry the
        # visitor into the code step instead of refusing them.
        pending = self.client.post('/api/login/', login)
        self.assertEqual(pending.status_code, 403)
        self.assertEqual(pending.json()['code'], 'ACCOUNT_NOT_VERIFIED')
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


class ResetPasswordStrengthTests(APITestCase):
    """A reset must not be a way around the rules registration enforces."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="amina", email="amina@example.test", password="original-pass-123"
        )
        self.otp = PasswordResetOTP.objects.create(user=self.user, otp="123456")

    def reset(self, new_password):
        return self.client.post(
            "/api/reset-password/",
            {"email": "amina@example.test", "otp": "123456", "new_password": new_password},
        )

    def test_common_password_is_rejected(self):
        response = self.reset("password123")

        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.json())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("original-pass-123"))

    def test_all_numeric_password_is_rejected(self):
        response = self.reset("948172635104")

        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.json())

    def test_a_strong_password_is_accepted(self):
        response = self.reset("heritage-archive-92")

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("heritage-archive-92"))


class OtpShapeTests(APITestCase):
    def test_a_non_numeric_code_is_rejected_before_any_lookup(self):
        response = self.client.post("/api/verify_otp/", {"username": "amina", "otp": "abcdef"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("otp", response.json())


class UnverifiedLoginTests(APITestCase):
    """Signing in to an unverified account should lead to verification, not a wall."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="pending", email="pending@example.test", password="heritage-archive-92"
        )
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

    def login(self, password):
        return self.client.post(
            "/api/login/", {"username": "pending", "password": password}, format="json"
        )

    def test_correct_password_reports_the_account_is_unverified(self):
        response = self.login("heritage-archive-92")

        self.assertEqual(response.status_code, 403)
        body = response.json()
        self.assertEqual(body["code"], "ACCOUNT_NOT_VERIFIED")
        self.assertEqual(body["username"], "pending")

    def test_no_session_is_issued_for_an_unverified_account(self):
        body = self.login("heritage-archive-92").json()

        self.assertNotIn("access", body)
        self.assertNotIn("refresh", body)

    def test_a_wrong_password_never_reveals_that_the_account_exists(self):
        wrong = self.login("not-the-password").json()
        unknown = self.client.post(
            "/api/login/",
            {"username": "nobody-here", "password": "heritage-archive-92"},
            format="json",
        ).json()

        # Identical replies, so the endpoint cannot be used to discover usernames.
        self.assertEqual(wrong, unknown)
        self.assertNotIn("code", wrong)

    def test_a_verified_account_still_logs_in_normally(self):
        self.user.is_active = True
        self.user.save(update_fields=["is_active"])

        response = self.login("heritage-archive-92")

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.json())


class RegistrationCodeIsolationTests(APITestCase):
    def test_same_code_on_two_accounts_verifies_only_requested_username(self):
        one = User.objects.create_user("code_one", is_active=False)
        two = User.objects.create_user("code_two", is_active=False)
        OTPVerification.objects.create(user=one, otp="123456")
        OTPVerification.objects.create(user=two, otp="123456")
        response = self.client.post("/api/verify_otp/", {"username": one.username, "otp": "123456"})
        self.assertEqual(response.status_code, 200)
        one.refresh_from_db(); two.refresh_from_db()
        self.assertTrue(one.is_active)
        self.assertFalse(two.is_active)

    def test_another_accounts_code_does_not_activate_requested_user(self):
        one = User.objects.create_user("code_one", is_active=False)
        two = User.objects.create_user("code_two", is_active=False)
        OTPVerification.objects.create(user=one, otp="123456")
        OTPVerification.objects.create(user=two, otp="654321")
        response = self.client.post("/api/verify_otp/", {"username": one.username, "otp": "654321"})
        self.assertEqual(response.status_code, 400)
        one.refresh_from_db(); two.refresh_from_db()
        self.assertFalse(one.is_active)
        self.assertFalse(two.is_active)
