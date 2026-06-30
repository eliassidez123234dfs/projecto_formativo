from django.contrib import admin

from .models import Usuario, Token_Verificacion, Cambio_Email, Historial_Estado_Usuario, Log_Auditoria


class UsuarioAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'correo', 'rol', 'is_superuser', 'token_version', 'estado', 'email_verificado', 'fecha_registro']
    list_filter = ['rol', 'estado', 'is_superuser', 'email_verificado']
    search_fields = ['usuario', 'correo']
    ordering = ['-fecha_registro']
    readonly_fields = ['fecha_registro', 'fecha_ultima_sesion']


class TokenVerificacionAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'tipo', 'usado', 'fecha_creacion', 'fecha_expiracion']
    list_filter = ['tipo', 'usado']
    search_fields = ['usuario__usuario', 'token']


class CambioEmailAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'email_anterior', 'email_nuevo', 'verificado', 'fecha_solicitud']
    list_filter = ['verificado']


class HistorialEstadoUsuarioAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'estado_anterior', 'estado_nuevo', 'fecha_cambio', 'admin']
    list_filter = ['estado_anterior', 'estado_nuevo']


class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario_admin', 'usuario_afectado', 'accion', 'fecha_accion']
    list_filter = ['accion', 'fecha_accion']
    search_fields = ['accion', 'usuario_admin__usuario', 'usuario_afectado__usuario']
    readonly_fields = ['fecha_accion']


admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(Token_Verificacion, TokenVerificacionAdmin)
admin.site.register(Cambio_Email, CambioEmailAdmin)
admin.site.register(Historial_Estado_Usuario, HistorialEstadoUsuarioAdmin)
admin.site.register(Log_Auditoria, LogAuditoriaAdmin)
