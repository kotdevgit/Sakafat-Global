import logging
from smtplib import SMTPException

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Contact
from .permissions import ContactPersmission
from .serializer import ContactSerializers

logger = logging.getLogger(__name__)


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializers
    permission_classes = [ContactPersmission]

    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        contact = serializer.save()

        # 1. Send acknowledgement email to user
        user_plain_message = (
            f"Dear {contact.full_name},\n\n"
            "Thank you for contacting us.\n"
            "We have received your enquiry successfully.\n\n"
            f"Subject: {contact.subject}\n"
            f"Enquiry Type: {contact.get_enquiry_type_display()}\n\n"
            "Our team will review your message and get back to you soon.\n\n"
            "Regards,\n"
            "Saqafat Global"
        )
        user_html_message = render_to_string(
            "emails/contact_user_acknowledgement.html",
            {"contact": contact},
        )
        try:
            send_mail(
                subject="Your enquiry has been received",
                message=user_plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[contact.email],
                html_message=user_html_message,
                fail_silently=False,
            )
        except (OSError, SMTPException):
            # The enquiry is already stored; a mail outage must not discard it.
            logger.exception("Acknowledgement email failed for enquiry %s", contact.pk)

        # 2. Notify site administrators about the incoming submission
        raw_admin_emails = getattr(settings, "CONTACT_NOTIFICATION_EMAIL", "")
        if raw_admin_emails:
            if isinstance(raw_admin_emails, str):
                admin_recipients = [email.strip() for email in raw_admin_emails.split(",") if email.strip()]
            elif isinstance(raw_admin_emails, (list, tuple)):
                admin_recipients = list(raw_admin_emails)
            else:
                admin_recipients = [str(raw_admin_emails)]

            if admin_recipients:
                extra_lines = []
                if contact.organisation:
                    extra_lines.append(f"Organisation: {contact.organisation}")
                if contact.phone_number:
                    extra_lines.append(f"Phone: {contact.phone_number}")
                if contact.country_city:
                    extra_lines.append(f"Location: {contact.country_city}")
                if contact.relevant_link:
                    extra_lines.append(f"Relevant Link: {contact.relevant_link}")
                if contact.attachment:
                    extra_lines.append(f"Attachment: {contact.attachment.name}")

                extra_details = ("\n" + "\n".join(extra_lines)) if extra_lines else ""

                admin_url = f"/admin/Contact/contact/{contact.pk}/change/"
                admin_plain_message = (
                    "A new contact enquiry has been submitted on Sakafat Global.\n\n"
                    "Enquiry Details:\n"
                    "----------------\n"
                    f"Full Name: {contact.full_name}\n"
                    f"Email: {contact.email}"
                    f"{extra_details}\n"
                    f"Enquiry Type: {contact.get_enquiry_type_display()}\n"
                    f"Subject: {contact.subject}\n\n"
                    "Message:\n"
                    f"{contact.message}\n\n"
                    "---\n"
                    "Manage this submission in Django Admin:\n"
                    f"{admin_url}\n"
                )
                admin_html_message = render_to_string(
                    "emails/contact_admin_notification.html",
                    {"contact": contact, "admin_url": admin_url},
                )

                try:
                    send_mail(
                        subject=f"New Enquiry: {contact.subject} ({contact.full_name})",
                        message=admin_plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=admin_recipients,
                        html_message=admin_html_message,
                        fail_silently=False,
                    )
                except (OSError, SMTPException):
                    logger.exception("Admin notification email failed for enquiry %s", contact.pk)

