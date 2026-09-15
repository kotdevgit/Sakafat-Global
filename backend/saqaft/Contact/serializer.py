from rest_framework import serializers
from .models import Contact
class ContactSerializers(serializers.ModelSerializer):
      class Meta:
            model = Contact
            fields = "__all__"
            read_only_fields = ["created_at"]