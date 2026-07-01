from django.contrib import admin

from .models import Usuario, Token_Verificacion, Cambio_Email, Historial_Estado_Usuario, Log_Auditoria


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'correo', 'rol', 'estado', 'email_verificado', 'fecha_registro')
    list_filter = ('rol', 'estado', 'email_verificado')
    search_fields = ('usuario', 'correo')
    ordering = ('-fecha_registro',)
    readonly_fields = ('fecha_registro', 'fecha_ultima_sesion', 'fecha_bloqueo', 'fecha_desbloqueo', 'fecha_eliminacion')


@admin.register(Token_Verificacion)
class TokenVerificacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'tipo', 'usado', 'fecha_creacion', 'fecha_expiracion')
    list_filter = ('tipo', 'usado')
    search_fields = ('usuario__usuario', 'token')
    readonly_fields = ('token', 'fecha_creacion')


@admin.register(Cambio_Email)
class CambioEmailAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'email_anterior', 'email_nuevo', 'verificado', 'fecha_solicitud')
    list_filter = ('verificado',)
    search_fields = ('usuario__usuario', 'email_anterior', 'email_nuevo')


@admin.register(Historial_Estado_Usuario)
class HistorialEstadoUsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'estado_anterior', 'estado_nuevo', 'admin', 'fecha_cambio')
    list_filter = ('estado_anterior', 'estado_nuevo')
    search_fields = ('usuario__usuario', 'admin__usuario')
    readonly_fields = ('fecha_cambio',)


@admin.register(Log_Auditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario_admin', 'usuario_afectado', 'accion', 'fecha_accion', 'ip_admin')
    list_filter = ('accion', 'fecha_accion')
    search_fields = ('usuario_admin__usuario', 'usuario_afectado__usuario', 'accion')
    readonly_fields = ('fecha_accion',)
