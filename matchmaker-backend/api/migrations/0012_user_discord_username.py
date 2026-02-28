# Generated migration for Discord username (display/linking)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_user_discord_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="discord_username",
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
    ]
