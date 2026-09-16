import re

from rest_framework import serializers

from .models import Contact

# Letters of any script, so Urdu and Arabic names pass as readily as Latin ones.
# These are the joiners real names and places carry; digits and symbols are what
# the checks reject.
NAME_EXTRAS = " '’.-"
PLACE_EXTRAS = " '’.,-"
ORGANISATION_EXTRAS = " &'’.,()/-"

PHONE_SHAPE = re.compile(r"^\+?[\d\s()-]+$")
PHONE_MIN_DIGITS = 7
# E.164 caps a number at 15 digits including the country code.
PHONE_MAX_DIGITS = 15

MESSAGE_MAX_LENGTH = 500


def _letters_only(value, extras, message):
      """Rejects anything that is not a letter or one of the allowed joiners."""
      if not value[0].isalpha():
            raise serializers.ValidationError(message)
      if any(not (char.isalpha() or char in extras) for char in value):
            raise serializers.ValidationError(message)
      return value


class ContactSerializers(serializers.ModelSerializer):
      class Meta:
            model = Contact
            fields = "__all__"
            read_only_fields = ["created_at"]
            extra_kwargs = {
                  # The form asks for all three, and the endpoint is public, so the
                  # requirement is enforced here rather than trusting the browser.
                  "phone_number": {"required": True, "allow_blank": False},
                  "email": {"required": True, "allow_blank": False},
                  "full_name": {"required": True, "allow_blank": False},
            }

      def validate_full_name(self, value):
            value = value.strip()
            if len(value) < 2:
                  raise serializers.ValidationError("Full name must be at least 2 characters.")
            return _letters_only(
                  value,
                  NAME_EXTRAS,
                  "Use letters only — spaces, hyphens and apostrophes are fine, but not digits.",
            )

      def validate_organisation(self, value):
            value = value.strip()
            if not value:
                  return value
            if len(value) < 2:
                  raise serializers.ValidationError("Organisation must be at least 2 characters.")
            if not (value[0].isalnum()):
                  raise serializers.ValidationError("Use letters, numbers and standard punctuation.")
            if any(not (char.isalnum() or char in ORGANISATION_EXTRAS) for char in value):
                  raise serializers.ValidationError("Use letters, numbers and standard punctuation.")
            return value

      def validate_country_city(self, value):
            value = value.strip()
            if not value:
                  return value
            if len(value) < 2:
                  raise serializers.ValidationError("Country and city must be at least 2 characters.")
            return _letters_only(
                  value, PLACE_EXTRAS, "Use letters only — for example, Pakistan, Lahore."
            )

      def validate_phone_number(self, value):
            value = value.strip()
            if not PHONE_SHAPE.match(value):
                  raise serializers.ValidationError(
                        "Use digits, and optionally a leading + for the country code."
                  )
            digits = sum(char.isdigit() for char in value)
            if digits < PHONE_MIN_DIGITS:
                  raise serializers.ValidationError(
                        f"Phone number must include at least {PHONE_MIN_DIGITS} digits."
                  )
            if digits > PHONE_MAX_DIGITS:
                  raise serializers.ValidationError(
                        f"Phone number must include no more than {PHONE_MAX_DIGITS} digits."
                  )
            return value

      def validate_subject(self, value):
            value = value.strip()
            if len(value) < 3:
                  raise serializers.ValidationError("Subject must be at least 3 characters.")
            if not any(char.isalpha() for char in value):
                  raise serializers.ValidationError("Describe your enquiry in a few words.")
            return value

      def validate_message(self, value):
            value = value.strip()
            if len(value) < 20:
                  raise serializers.ValidationError("Message must be at least 20 characters.")
            # The column is a TextField, so the cap is enforced here rather than by
            # the schema; the form applies the same limit.
            if len(value) > MESSAGE_MAX_LENGTH:
                  raise serializers.ValidationError(
                        f"Message must be {MESSAGE_MAX_LENGTH} characters or fewer."
                  )
            if not any(char.isalpha() for char in value):
                  raise serializers.ValidationError("Tell us a little about your enquiry.")
            return value

      def validate_consent(self, value):
            if not value:
                  raise serializers.ValidationError(
                        "Consent is required before we can respond to your enquiry."
                  )
            return value
