from pathlib import Path

from django.core.files import File
from django.db import migrations

# The episodes the homepage published before they were editable in the admin.
SEED = [
    {
        "slug": "culture-in-motion",
        "title": "A Culture in Motion",
        "category": "documentary",
        "description": "People, places and the stories shaping contemporary Pakistan.",
        "image_alt": "An interviewer speaking with a guest at the Sakafat Global exhibition stand",
        "source_image": "image1.png",
    },
    {
        "slug": "conversations-that-matter",
        "title": "Conversations that Matter",
        "category": "dialogue",
        "description": "Relevant voices brought into responsible, structured exchange.",
        "image_alt": "Two women in conversation at the Sakafat Global exhibition stand",
        "source_image": "image2.png",
    },
    {
        "slug": "living-heritage",
        "title": "Living Heritage",
        "category": "performance",
        "description": "Music, poetry and performance carried forward with care.",
        "image_alt": "Four guests pictured at microphones during Sakafat Global conversations",
        "source_image": "image3.png",
    },
]

# The originals still live in the frontend's public folder.
SOURCE_DIR = Path(__file__).resolve().parents[3].parent / "frontend" / "public" / "images" / "featured"


def seed(apps, schema_editor):
    Episode = apps.get_model("Episode", "Episode")

    for position, entry in enumerate(SEED):
        fields = {key: value for key, value in entry.items() if key != "source_image"}
        # Never overwrite an episode the team has already edited in the admin.
        episode, created = Episode.objects.get_or_create(
            slug=entry["slug"],
            defaults={**fields, "position": position, "is_active": True},
        )
        if not created or episode.image:
            continue
        source = SOURCE_DIR / entry["source_image"]
        if not source.is_file():
            # The record is still usable; the admin can upload an image later.
            continue
        with source.open("rb") as handle:
            episode.image.save(entry["source_image"], File(handle), save=True)


def unseed(apps, schema_editor):
    Episode = apps.get_model("Episode", "Episode")
    Episode.objects.filter(slug__in=[entry["slug"] for entry in SEED]).delete()


class Migration(migrations.Migration):

    dependencies = [("Episode", "0001_initial")]

    operations = [migrations.RunPython(seed, unseed)]
