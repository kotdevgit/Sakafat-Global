from django.db import migrations

# Statuses stored before the choices were de-duplicated ("upcomming", "register interest").
LEGACY_STATUSES = {
    "upcomming": "upcoming",
    "register interest": "register_interest",
}

# The programmes the site published before they were editable in the admin.
SEED = [
    {
        "slug": "signals",
        "name": "Sakafat Signals 01.0",
        "pillar": "ikhlakiat",
        "status": "open",
        "description": "A bilingual cultural-media open call designed to discover emerging stories, creative ideas and cultural voices.",
    },
    {
        "slug": "lawtency",
        "name": "Lawtency",
        "pillar": "idraak",
        "status": "development",
        "description": "Accessible legal awareness and civic understanding through responsible public education and dialogue.",
    },
    {
        "slug": "confidence",
        "name": "Confidence Camp",
        "pillar": "falah",
        "status": "register_interest",
        "description": "Practical experiences designed to strengthen communication, confidence and meaningful participation.",
    },
    {
        "slug": "career",
        "name": "Career Rasta",
        "pillar": "rabta",
        "status": "upcoming",
        "description": "Career direction, skills awareness and deliberate pathways into education, employment and enterprise.",
    },
    {
        "slug": "minds",
        "name": "MindsBehind",
        "pillar": "idraak",
        "status": "development",
        "description": "A proposed long-form format exploring cognition, resilience and the human stories behind important decisions.",
    },
    {
        "slug": "sama",
        "name": "Sakafat Sama",
        "pillar": "sama",
        "status": "development",
        "description": "A developing cultural production platform for Sufi and folk music, poetry and heritage performance.",
    },
]


def seed(apps, schema_editor):
    Programme = apps.get_model("Programme", "Programme")

    for stored, replacement in LEGACY_STATUSES.items():
        Programme.objects.filter(status=stored).update(status=replacement)

    for position, entry in enumerate(SEED):
        # Never overwrite a programme the team has already edited in the admin.
        Programme.objects.get_or_create(
            slug=entry["slug"],
            defaults={**entry, "position": position, "is_active": True},
        )


def unseed(apps, schema_editor):
    Programme = apps.get_model("Programme", "Programme")
    Programme.objects.filter(slug__in=[entry["slug"] for entry in SEED]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("Programme", "0003_alter_programme_options_programme_pillar_and_more"),
    ]

    operations = [migrations.RunPython(seed, unseed)]
