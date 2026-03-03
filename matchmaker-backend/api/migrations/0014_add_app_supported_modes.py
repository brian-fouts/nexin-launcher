# Add App.supported_modes: list of hosting modes (official_host, community_host, self_hosted)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0013_delete_item"),
    ]

    operations = [
        migrations.AddField(
            model_name="app",
            name="supported_modes",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="List of supported hosting modes: official_host, community_host, self_hosted",
            ),
        ),
    ]
