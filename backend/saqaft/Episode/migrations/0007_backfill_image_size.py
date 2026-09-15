from django.db import migrations


def backfill(apps, schema_editor):
    Episode = apps.get_model("Episode", "Episode")
    for episode in Episode.objects.exclude(image=""):
        if not episode.image:
            continue
        try:
            width, height = episode.image.width, episode.image.height
        except (OSError, ValueError):
            # A missing or unreadable file should not stop the migration.
            continue
        Episode.objects.filter(pk=episode.pk).update(image_width=width, image_height=height)


class Migration(migrations.Migration):

    dependencies = [("Episode", "0006_episode_image_height_episode_image_width_and_more")]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
