from django.contrib import admin

from .models import Contacto


@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'correo', 'asunto', 'leido', 'fecha_envio')
    list_filter = ('leido', 'fecha_envio')
    search_fields = ('nombre', 'correo', 'asunto')
    readonly_fields = ('fecha_envio', 'fecha_lectura', 'ip_origen')
