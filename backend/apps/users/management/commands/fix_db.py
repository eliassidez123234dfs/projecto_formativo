import sys
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from django.apps import apps


FIELD_TYPE_MAP = {
    'AutoField': 'BIGSERIAL PRIMARY KEY',
    'BigAutoField': 'BIGSERIAL PRIMARY KEY',
    'IntegerField': 'INTEGER DEFAULT 0',
    'SmallIntegerField': 'SMALLINT DEFAULT 0',
    'BigIntegerField': 'BIGINT DEFAULT 0',
    'CharField': 'VARCHAR({max_length})',
    'TextField': 'TEXT',
    'EmailField': 'VARCHAR(254)',
    'URLField': 'VARCHAR({max_length})',
    'BooleanField': 'BOOLEAN DEFAULT FALSE',
    'NullBooleanField': 'BOOLEAN',
    'FloatField': 'DOUBLE PRECISION',
    'DecimalField': 'NUMERIC(10, 2)',
    'DateField': 'DATE',
    'DateTimeField': 'TIMESTAMP WITH TIME ZONE',
    'TimeField': 'TIME',
    'FileField': 'VARCHAR(100)',
    'ImageField': 'VARCHAR(100)',
    'JSONField': 'JSONB DEFAULT \'{}\'',
    'UUIDField': 'UUID',
    'PositiveIntegerField': 'INTEGER DEFAULT 0',
    'PositiveSmallIntegerField': 'SMALLINT DEFAULT 0',
    'PositiveBigIntegerField': 'BIGINT DEFAULT 0',
    'ForeignKey': 'INTEGER',
    'OneToOneField': 'INTEGER',
    'ManyToManyField': None,  # skip, handled separately
}


def get_column_sql(field):
    """Generate SQL for a Django field."""
    field_type = type(field).__name__

    if field_type in ('ForeignKey', 'OneToOneField'):
        return 'INTEGER'

    template = FIELD_TYPE_MAP.get(field_type)
    if template is None:
        return None

    if isinstance(template, str) and '{max_length}' in template:
        return template.format(max_length=getattr(field, 'max_length', 255))

    return template


class Command(BaseCommand):
    help = "Arregla la BD: agrega columnas faltantes, falsifica migraciones y crea admin"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Paso 0: Detectar y agregar columnas faltantes ==="))

        with connection.cursor() as cursor:
            for model in apps.get_models():
                if not model._meta.managed:
                    continue
                if model._meta.proxy:
                    continue

                table_name = model._meta.db_table

                try:
                    cursor.execute(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_name = %s",
                        [table_name]
                    )
                    existing = {row[0] for row in cursor.fetchall()}
                except Exception:
                    continue

                if not existing:
                    continue

                for field in model._meta.local_fields:
                    col_name = field.column

                    if col_name in existing:
                        continue

                    sql = get_column_sql(field)
                    if sql is None:
                        continue

                    nullable = 'NULL' if field.null else 'NOT NULL DEFAULT '
                    if field.has_default():
                        default = field.get_default()
                        if default is not None:
                            if isinstance(default, bool):
                                default_sql = 'TRUE' if default else 'FALSE'
                            elif isinstance(default, (int, float)):
                                default_sql = str(default)
                            elif isinstance(default, str):
                                default_sql = f"'{default}'"
                            else:
                                default_sql = f"'{default}'"
                            nullable = f'NOT NULL DEFAULT {default_sql}'
                        else:
                            nullable = 'NULL'
                    elif field.null:
                        nullable = 'NULL'
                    else:
                        nullable = 'NOT NULL'

                    sql_type = sql.replace(' PRIMARY KEY', '')
                    alter = f'ALTER TABLE {table_name} ADD COLUMN {col_name} {sql_type} {nullable}'
                    try:
                        cursor.execute(alter)
                        self.stdout.write(self.style.SUCCESS(
                            f"  + {table_name}.{col_name} ({type(field).__name__})"
                        ))
                    except Exception as e:
                        self.stdout.write(f"  ! {table_name}.{col_name}: {e}")

            # Fix orders_order specifically - drop shipping_department if exists
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'orders_order' AND column_name = 'shipping_department'
            """)
            if cursor.fetchone():
                cursor.execute("ALTER TABLE orders_order DROP COLUMN shipping_department")
                self.stdout.write(self.style.SUCCESS("  - orders_order.shipping_department eliminada"))

        self.stdout.write("\n=== Paso 1.5: Crear tablas faltantes (editor_session) ===")
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS models3d_editorsession (
                    id BIGSERIAL PRIMARY KEY,
                    token UUID NOT NULL UNIQUE,
                    data JSONB NOT NULL DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    used BOOLEAN NOT NULL DEFAULT FALSE
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_editorsession_token ON models3d_editorsession(token)")
            self.stdout.write(self.style.SUCCESS("  Tabla models3d_editorsession verificada"))

        self.stdout.write("\n=== Paso 1: Falsificar migraciones conflictivas ===")

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
            ('models3d', '0004_editorsession'),
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

        self.stdout.write("\n=== Paso 2: Ejecutar migrate normal ===")
        try:
            call_command('migrate', '--run-syncdb', verbosity=1)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Migrate tuvo advertencias: {e}"))

        self.stdout.write("\n=== Paso 3: Creando admin ===")
        call_command('ensure_admin', verbosity=1)

        self.stdout.write(self.style.SUCCESS("\n¡Listo!"))
