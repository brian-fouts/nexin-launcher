# Remove unused Item model (demo resource)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0012_user_discord_username"),
    ]

    operations = [
        migrations.DeleteModel(name="Item"),
    ]
