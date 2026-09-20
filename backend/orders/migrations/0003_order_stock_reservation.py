from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("orders", "0002_payment")]

    operations = [
        migrations.AddField(model_name="order", name="reservation_expires_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="order", name="stock_released", field=models.BooleanField(default=False)),
    ]
