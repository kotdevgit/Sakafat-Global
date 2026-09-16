from django.core import mail
from django.test import TestCase, override_settings

from .models import Contact


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ContactEnquiryTests(TestCase):
    url = "/api/contact/"

    def payload(self, **overrides):
        data = {
            "full_name": "Amina Rahim",
            "email": "amina@example.test",
            "phone_number": "+92 300 1234567",
            "enquiry_type": "creative",
            "subject": "Creative collaboration proposal",
            "message": "We would like to collaborate on a heritage music series.",
            "consent": "true",
        }
        data.update(overrides)
        return data

    def test_public_enquiry_is_stored_and_acknowledged(self):
        response = self.client.post(self.url, self.payload())

        self.assertEqual(response.status_code, 201)
        contact = Contact.objects.get()
        self.assertEqual(contact.enquiry_type, "creative")
        self.assertTrue(contact.consent)
        self.assertEqual([contact.email], mail.outbox[0].to)

    def test_creative_collaboration_is_an_accepted_enquiry_type(self):
        self.assertIn("creative", dict(Contact.ENQUIRY_TYPE_CHOICES))

    def test_location_stays_optional(self):
        response = self.client.post(self.url, self.payload())

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Contact.objects.get().country_city, "")

    def test_name_phone_and_email_are_required(self):
        for field in ("full_name", "phone_number", "email"):
            with self.subTest(field=field):
                data = self.payload()
                data.pop(field)
                response = self.client.post(self.url, data)

                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json())
                self.assertFalse(Contact.objects.exists())

    def test_enquiry_without_consent_is_rejected(self):
        response = self.client.post(self.url, self.payload(consent="false"))

        self.assertEqual(response.status_code, 400)
        self.assertIn("consent", response.json())
        self.assertFalse(Contact.objects.exists())

    def test_unknown_enquiry_type_is_rejected(self):
        response = self.client.post(self.url, self.payload(enquiry_type="hacked"))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Contact.objects.exists())

    def test_enquiry_survives_a_failing_acknowledgement_email(self):
        with self.settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend", EMAIL_HOST="127.0.0.1", EMAIL_PORT=1):
            with self.assertLogs("Contact.views", level="ERROR"):
                response = self.client.post(self.url, self.payload())

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Contact.objects.count(), 1)

    def test_listing_enquiries_requires_staff(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ContactValidationTests(TestCase):
    """The endpoint is public, so it cannot rely on the browser's own checks."""

    url = "/api/contact/"

    def payload(self, **overrides):
        data = {
            "full_name": "Amina Rahim",
            "email": "amina@example.test",
            "phone_number": "+92 300 1234567",
            "enquiry_type": "creative",
            "subject": "Creative collaboration proposal",
            "message": "We would like to collaborate on a heritage music series.",
            "consent": "true",
        }
        data.update(overrides)
        return data

    def assertRejected(self, field, value):
        response = self.client.post(self.url, self.payload(**{field: value}))

        self.assertEqual(response.status_code, 400, f"{field}={value!r} was accepted")
        self.assertIn(field, response.json())
        self.assertFalse(Contact.objects.exists())

    def assertAccepted(self, field, value):
        response = self.client.post(self.url, self.payload(**{field: value}))

        self.assertEqual(response.status_code, 201, f"{field}={value!r} was rejected")
        Contact.objects.all().delete()

    def test_name_rejects_digits_and_symbols(self):
        for value in ("Amina 4", "Amina<script>", "Amina_Rahim", "123", "A"):
            with self.subTest(value=value):
                self.assertRejected("full_name", value)

    def test_name_accepts_real_names_in_any_script(self):
        # A bilingual site: an Urdu name must pass as readily as a Latin one.
        for value in ("Muhammad Ali-Khan", "O’Brien", "St. John Smith", "امینہ رحیم"):
            with self.subTest(value=value):
                self.assertAccepted("full_name", value)

    def test_phone_rejects_letters_and_implausible_lengths(self):
        for value in ("not a phone", "12345", "+" + "9" * 20):
            with self.subTest(value=value):
                self.assertRejected("phone_number", value)

    def test_phone_accepts_common_formats(self):
        for value in ("+92 300 1234567", "0300-1234567", "(042) 3577 1234"):
            with self.subTest(value=value):
                self.assertAccepted("phone_number", value)

    def test_location_rejects_digits(self):
        self.assertRejected("country_city", "Lahore 54000")

    def test_message_and_subject_enforce_a_minimum(self):
        self.assertRejected("message", "Too short")
        self.assertRejected("subject", "Hi")

    def test_subject_must_contain_a_letter(self):
        self.assertRejected("subject", "......")

    def test_over_length_values_are_rejected(self):
        self.assertRejected("full_name", "A" * 151)
        self.assertRejected("subject", "S" * 101)
        self.assertRejected("message", "M" * 501)
