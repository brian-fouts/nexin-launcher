# Generated migration for Discord OAuth2

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_lfg_member"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="discord_id",
            field=models.CharField(blank=True, db_index=True, max_length=32, null=True, unique=True),
        ),
    ]
