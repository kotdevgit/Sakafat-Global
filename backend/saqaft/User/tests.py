from datetime import timedelta
from smtplib import SMTPException
from unittest.mock import patch
from django.contrib.auth.models import User
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from .models import OTPVerification, PasswordResetOTP


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
