# Reconciliación de la cadena de migraciones de orders.
# La cadena original saltaba de 0001_initial a 0003_alter_order_status
# (la migración 0002 no existía en disco). Esta migración vacía enlaza
# 0001 -> 0002 -> 0003 para mantener la cadena contigua y consistente.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
    ]
