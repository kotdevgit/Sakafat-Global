import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("Episode", "0002_seed_episodes")]

    operations = [
        migrations.CreateModel(
            name="EpisodeCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=60, unique=True)),
                ("slug", models.SlugField(unique=True)),
                ("position", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["position", "name"], "verbose_name_plural": "episode categories"},
        ),
        migrations.AddField(
            model_name="episode",
            name="category_ref",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="episodes",
                to="Episode.episodecategory",
            ),
        ),
    ]
