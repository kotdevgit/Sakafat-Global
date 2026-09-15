from django.core.mail import send_mail
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework import viewsets
from .models import Contact
from .serializer import ContactSerializers
from .permissions import ContactPersmission
from rest_framework.parsers import MultiPartParser, FormParser

    
class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializers
    permission_classes = [ContactPersmission]

    parser_classes =[MultiPartParser,FormParser]

    def perform_create(self,serializer):
        contact=serializer.save()

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