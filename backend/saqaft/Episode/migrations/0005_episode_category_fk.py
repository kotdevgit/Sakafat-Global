import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("Episode", "0004_move_categories_to_lookup")]

    operations = [
        migrations.RemoveField(model_name="episode", name="category"),
        migrations.RenameField(model_name="episode", old_name="category_ref", new_name="category"),
        migrations.AlterField(
            model_name="episode",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="episodes",
                to="Episode.episodecategory",
            ),
        ),
    ]
