from django.db import migrations, models


def add_is_superuser_if_not_exists(apps, schema_editor):
    """Agrega la columna is_superuser si no existe."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'usuarios' AND column_name = 'is_superuser'
        """)
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE usuarios ADD COLUMN is_superuser BOOLEAN DEFAULT FALSE")


def remove_is_superuser_if_exists(apps, schema_editor):
    """Revés de la migración."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'usuarios' AND column_name = 'is_superuser'
        """)
        if cursor.fetchone():
            cursor.execute("ALTER TABLE usuarios DROP COLUMN is_superuser")


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_merge_20260907_1733'),
    ]

    operations = [
        migrations.RunPython(add_is_superuser_if_not_exists, remove_is_superuser_if_exists),
    ]
