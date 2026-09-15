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

    def test_phone_and_location_are_optional(self):
        response = self.client.post(self.url, self.payload())

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Contact.objects.get().phone_number, "")

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
