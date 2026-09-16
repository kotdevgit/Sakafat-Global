from django.db import models

class Contact(models.Model):
    ENQUIRY_TYPE_CHOICES = [
        ("general", "General"),
        ("partnership", "Partnership"),
        ("programme", "Programme"),
        ("creative", "Creative Collaboration"),
        ("media", "Media"),
        ("other", "Other"),
    ]
    full_name = models.CharField(max_length=150)
    organisation = models.CharField(max_length=200, blank=True)
    email = models.EmailField()
    phone_number = models.CharField(max_length=30, blank=True)
    country_city = models.CharField(max_length=150, blank=True)
    enquiry_type = models.CharField(max_length=30,choices=ENQUIRY_TYPE_CHOICES)
    subject = models.CharField(max_length=100)
    message = models.TextField()
    relevant_link = models.URLField(blank=True,null=True)
    attachment = models.FileField(upload_to="enquiries/",blank=True,null=True)
    consent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} - {self.subject}"