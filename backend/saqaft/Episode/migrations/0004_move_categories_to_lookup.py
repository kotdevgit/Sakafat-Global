from django.db import migrations

# The categories the fixed choice list used to hold, with their display names.
ORIGINAL = [("documentary", "Documentary"), ("dialogue", "Dialogue"), ("performance", "Performance")]


def to_lookup(apps, schema_editor):
    EpisodeCategory = apps.get_model("Episode", "EpisodeCategory")
    Episode = apps.get_model("Episode", "Episode")

    for position, (slug, name) in enumerate(ORIGINAL):
        EpisodeCategory.objects.get_or_create(slug=slug, defaults={"name": name, "position": position})

    # Carry across any value stored before the lookup table existed.
    for stored in Episode.objects.values_list("category", flat=True).distinct():
        if not stored:
            continue
        EpisodeCategory.objects.get_or_create(
            slug=stored, defaults={"name": stored.replace("-", " ").title(), "position": 99}
        )

    for category in EpisodeCategory.objects.all():
        Episode.objects.filter(category=category.slug).update(category_ref=category)


def to_choices(apps, schema_editor):
    Episode = apps.get_model("Episode", "Episode")
    for episode in Episode.objects.select_related("category_ref"):
        if episode.category_ref:
            episode.category = episode.category_ref.slug
            episode.save(update_fields=["category"])


class Migration(migrations.Migration):

    dependencies = [("Episode", "0003_episodecategory")]

    operations = [migrations.RunPython(to_lookup, to_choices)]
