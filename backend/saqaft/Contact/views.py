import logging
from smtplib import SMTPException

from django.conf import settings
from django.core.mail import send_mail
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

    parser_classes =[MultiPartParser,FormParser]

    def perform_create(self,serializer):
        contact=serializer.save()

        try:
            send_mail(
                subject="Your enquiry has been received",
                message=f"""
                   Dear {contact.full_name},
                   Thank you for contacting us.
                   We have received your enquiry successfully.
                   Subject: {contact.subject}
                   Enquiry Type: {contact.get_enquiry_type_display()}
                   Our team will review your message and get back to you soon.
                   Regards,
                   Saqafat Global""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[contact.email],
                fail_silently=False,
            )
        except (OSError, SMTPException):
            # The enquiry is already stored; a mail outage must not discard it.
            logger.exception("Acknowledgement email failed for enquiry %s", contact.pk)
