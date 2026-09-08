import sys
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection


class Command(BaseCommand):
    help = "Falsifica migraciones problemáticas y crea admin"

    def handle(self, *args, **options):
        self.stdout.write("=== Paso 0: Agregar columnas faltantes con SQL ===")
        with connection.cursor() as cursor:
            # Verificar y agregar is_superuser
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'usuarios' AND column_name = 'is_superuser'
            """)
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE usuarios ADD COLUMN is_superuser BOOLEAN DEFAULT FALSE")
                self.stdout.write(self.style.SUCCESS("  Columna is_superuser agregada"))
            else:
                self.stdout.write("  Columna is_superuser ya existe")

            # Verificar y agregar token_version
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'usuarios' AND column_name = 'token_version'
            """)
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE usuarios ADD COLUMN token_version INTEGER DEFAULT 0")
                self.stdout.write(self.style.SUCCESS("  Columna token_version agregada"))
            else:
                self.stdout.write("  Columna token_version ya existe")

            # Verificar y agregar is_staff
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'usuarios' AND column_name = 'is_staff'
            """)
            if cursor.fetchone():
                cursor.execute("ALTER TABLE usuarios DROP COLUMN is_staff")
                self.stdout.write(self.style.SUCCESS("  Columna is_staff eliminada"))

        self.stdout.write("\n=== Paso 1: Arreglando migraciones conflictivas ===")

        problematic = [
            ('orders', '0004_add_shipping_payment_fields'),
            ('orders', '0005_order_cloudinary_public_id_order_design_color_and_more'),
            ('orders', '0006_alter_order_status'),
            ('orders', '0003_alter_order_user'),
            ('orders', '0004_order_order_number_order_payment_confirmed_at_and_more'),
            ('orders', '0005_order_delivered_at'),
            ('orders', '0007_invoice'),
            ('orders', '0008_merge_0005_order_delivered_at_0007_invoice'),
            ('products', '0002_productimage_cloudinary_url_alter_productimage_image'),
            ('products', '0003_variant_precio_variante_alter_productaudit_action_and_more'),
            ('products', '0004_review'),
            ('products', '0002_product_approved_at_product_approved_by_and_more'),
            ('products', '0003_backfill_colors_and_cop_prices'),
            ('products', '0005_merge_0003_backfill_colors_and_cop_prices_0004_review'),
            ('products', '0006_remove_productimage_cloudinary_url_and_more'),
            ('carts', '0003_cart_order'),
            ('carts', '0004_alter_cart_session_key'),
            ('carts', '0005_merge_20260907_1733'),
            ('carts', '0006_remove_cart_order'),
            ('catalog', '0002_catalogsession'),
            ('catalog', '0003_alter_catalogfilter_config_and_more'),
            ('catalog', '0002_alter_catalogfilter_config_and_more'),
            ('catalog', '0004_merge_20260907_1735'),
            ('landing', '0002_alter_contacto_options'),
            ('landing', '0002_alter_contacto_asunto_alter_contacto_correo_and_more'),
            ('landing', '0003_merge_20260907_1733'),
            ('models3d', '0002_cloudinaryresource'),
            ('models3d', '0003_alter_model3d_file_type'),
            ('token_blacklist', '0002_outstandingtoken_jti_hex'),
            ('token_blacklist', '0003_auto_20171017_2007'),
            ('token_blacklist', '0004_auto_20171017_2013'),
            ('token_blacklist', '0005_remove_outstandingtoken_jti'),
            ('token_blacklist', '0006_auto_20171017_2113'),
            ('token_blacklist', '0007_auto_20171017_2214'),
            ('token_blacklist', '0008_migrate_to_bigautofield'),
            ('token_blacklist', '0010_fix_migrate_to_bigautofield'),
            ('token_blacklist', '0011_linearizes_history'),
            ('token_blacklist', '0012_alter_outstandingtoken_user'),
            ('token_blacklist', '0013_alter_blacklistedtoken_options_and_more'),
            ('users', '0003_alter_usuario_usuario'),
            ('users', '0004_usuario_is_superuser'),
            ('users', '0005_usuario_token_version'),
            ('users', '0003_remove_cambio_email'),
            ('users', '0004_add_is_staff_is_superuser_fields'),
            ('users', '0005_remove_usuario_is_staff_usuario_token_version_and_more'),
            ('users', '0006_merge_20260907_1733'),
            ('users', '0007_fix_is_superuser_column'),
        ]

        for app, name in problematic:
            try:
                call_command('migrate', app, name, fake=True, verbosity=0)
                self.stdout.write(f"  Faked: {app}.{name}")
            except Exception as e:
                self.stdout.write(f"  Skip: {app}.{name} ({e})")

        self.stdout.write("\n=== Ahora ejectutando migrate normal ===")
        try:
            call_command('migrate', '--run-syncdb', verbosity=1)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Migrate tuvo advertencias: {e}"))

        self.stdout.write("\n=== Creando admin ===")
        call_command('ensure_admin', verbosity=1)

        self.stdout.write(self.style.SUCCESS("\n¡Listo!"))
