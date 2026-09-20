from django.db import models


class Programme(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("register_interest", "Register Interest"),
        ("upcoming", "Upcoming"),
        ("development", "In Development"),
    ]
    PILLAR_CHOICES = [
        ("ikhlakiat", "Ikhlakiat"),
        ("idraak", "Idraak"),
        ("falah", "Falah"),
        ("rabta", "Rabta"),
        ("sama", "Sama"),
    ]
    name = models.CharField(max_length=200)
    name_ur = models.CharField(max_length=200, blank=True, default="")
    slug = models.SlugField(unique=True)
    pillar = models.CharField(max_length=20, choices=PILLAR_CHOICES)
    description = models.TextField()
    description_ur = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20,choices=STATUS_CHOICES)
    image = models.ImageField(upload_to="programmes/",blank=True,null=True)
    # Controls the order of the public cards; lower numbers are shown first.
    position = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return self.name
