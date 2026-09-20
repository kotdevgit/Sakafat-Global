from django.db import migrations


def make_living_heritage_latest(apps, schema_editor):
    Episode = apps.get_model("Episode", "Episode")
    # Position 0 puts Living Heritage first, making it the latest/featured hero episode.
    Episode.objects.filter(slug="living-heritage").update(position=0)
    Episode.objects.filter(slug="culture-in-motion").update(position=1)
    Episode.objects.filter(slug="conversations-that-matter").update(position=2)


def revert_ordering(apps, schema_editor):
    Episode = apps.get_model("Episode", "Episode")
    Episode.objects.filter(slug="culture-in-motion").update(position=0)
    Episode.objects.filter(slug="conversations-that-matter").update(position=1)
    Episode.objects.filter(slug="living-heritage").update(position=2)


class Migration(migrations.Migration):

    dependencies = [
        ("Episode", "0010_episode_description_ur_episode_image_alt_ur_and_more"),
    ]

    operations = [
        migrations.RunPython(make_living_heritage_latest, revert_ordering),
    ]
