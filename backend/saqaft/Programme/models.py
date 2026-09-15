from django.db import models

class Programme(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("upcoming", "Upcoming"),
        ("development", "In Development"),
        ("register interest","Register Interest"),
        ("upcomming","Upcoming"),
    ]
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    status = models.CharField(max_length=20,choices=STATUS_CHOICES)
    image = models.ImageField(upload_to="programmes/",blank=True,null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name