from django.db import migrations, models


def approve_existing_products(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    Product.objects.all().update(approval_status="approved")


class Migration(migrations.Migration):
    dependencies = [("products", "0006_review")]

    operations = [
        migrations.AddField(
            model_name="product",
            name="approval_status",
            field=models.CharField(
                choices=[("pending", "Pending review"), ("approved", "Approved"), ("rejected", "Rejected")],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RunPython(approve_existing_products, migrations.RunPython.noop),
        migrations.AddField(
            model_name="product",
            name="moderation_note",
            field=models.TextField(blank=True),
        ),
    ]
