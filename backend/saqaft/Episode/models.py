from django.db import models


class EpisodeCategory(models.Model):
    """Editorial categories. Staff add these in the admin; no migration needed."""

    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(unique=True)
    # Controls the order categories appear in, lowest first.
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "name"]
        verbose_name_plural = "episode categories"

    def __str__(self):
        return self.name


class Episode(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(
        EpisodeCategory,
        on_delete=models.PROTECT,
        related_name="episodes",
    )
    description = models.TextField()
    image = models.ImageField(
        upload_to="episodes/",
        blank=True,
        null=True,
        width_field="image_width",
        height_field="image_height",
        help_text=(
            "Used for the card and, for the first episode, the homepage hero. "
            "The hero crops it to portrait, so upload at least 1040x1188 to keep it sharp. "
            "Smaller images are still used; they just look soft in the hero."
        ),
    )
    # Populated by Django on save; used to flag low-resolution artwork in the admin.
    image_width = models.PositiveIntegerField(null=True, blank=True, editable=False)
    image_height = models.PositiveIntegerField(null=True, blank=True, editable=False)
    hero_image = models.ImageField(
        upload_to="episodes/hero/",
        blank=True,
        null=True,
        width_field="hero_image_width",
        height_field="hero_image_height",
        verbose_name="portrait image",
        help_text=(
            "Optional upright version for the homepage hero card, ideally 1040x1188. "
            "Only the first episode reaches the hero, so this is worth preparing for the "
            "one you are featuring. Without it the hero centre-crops the image above."
        ),
    )
    hero_image_width = models.PositiveIntegerField(null=True, blank=True, editable=False)
    hero_image_height = models.PositiveIntegerField(null=True, blank=True, editable=False)
    image_alt = models.CharField(
        max_length=200,
        blank=True,
        help_text="Describes the image for screen readers. Leave blank if it adds nothing beyond the title.",
    )
    video_url = models.URLField(
        blank=True,
        null=True,
        help_text="Where the play button leads. The button stays disabled while this is empty.",
    )
    # Controls the order of the public cards; lower numbers are shown first.
    position = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return self.title
