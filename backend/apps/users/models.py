from django.db import models
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import BaseUserManager
from django.core.validators import EmailValidator
from django.utils import timezone
import secrets

# Clase de usuarios para el modelo de la base de datos del usuario bien estructurado
# Patron Active Record
class Usuario(models.Model):
    """Modelo unificado de Usuario (RI-001)"""
    # Los diferentes estados que usare en el apartado de usuarios
    ESTADO_CHOICES = (('Activo', 'Activo'), ('Inactivo', 'Inactivo'), ('Bloqueado', 'Bloqueado'),)
    
    objects = UsuarioManager()
    
    # Roles a usar en el usuario 
    ROL_CHOICES = (('Administrador', 'Administrador'), ('Usuario', 'Usuario'),)
    
    # Campos principales
    id = models.AutoField(primary_key=True)
    usuario = models.CharField(max_length=100, unique=True, null=False, verbose_name='username')
    correo = models.EmailField(unique=True, null=False, validators=[EmailValidator()])
    contrasena = models.CharField(max_length=255, null=False)
    
    # Estado y rol del los diferentes usuarios
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Inactivo')
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default='Usuario')
    
    # Registro y sesiones
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_ultima_sesion = models.DateTimeField(null=True, blank=True)
    
    # Verificación de email
    email_verificado = models.BooleanField(default=False)
    
    # Intentos fallidos de login y bloqueo
    intentos_fallidos = models.IntegerField(default=0)
    fecha_bloqueo = models.DateTimeField(null=True, blank=True)
    fecha_desbloqueo = models.DateTimeField(null=True, blank=True)
    admin_desbloqueador = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios_desbloqueados')
    
    # Soft delete
    eliminado = models.BooleanField(default=False)
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)

    # foreignkey a si mismo, PERMITE al administrador eliminar a un usuario sin crear tablas extras
    admin_eliminador = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios_eliminados')

    # Django auth required attributes
    USERNAME_FIELD = 'usuario'
    REQUIRED_FIELDS = ['correo']
    is_active = True

    # clase meta para poder poner indexes y mejorar la busquedad de lo siguiente de acuerdo a la matrix
    class Meta:
        db_table = 'usuarios'
        indexes = [
            models.Index(fields=['usuario']),
            models.Index(fields=['correo']),
            models.Index(fields=['estado', 'rol']),
            models.Index(fields=['fecha_registro']),
        ]
    
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    # funcion para mostrar en el backend los nombres de usuario y los de correo
    def __str__(self):
        return f"{self.usuario} ({self.correo})"


# Clase para para el modelo del token de verificacion el cual permite recuperar un token y mandarlo a el correo
class Token_Verificacion(models.Model):
    """Modelo para manejar tokens de verificación de email, 
    recuperación de contraseña y cambio de email (RI-009)"""
    
    # Tipo de token el cual se requiera utilizar en el caso de aplicarse
    TIPO_CHOICES = (('Verificacion_Email', 'Verificación de Email'), ('Recuperacion_Password', 'Recuperación de Contraseña'), ('Cambio_Email', 'Cambio de Email'),)
    
    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='tokens_verificacion') # nombre para identificar
    token = models.CharField(max_length=255, unique=True, default=secrets.token_urlsafe)
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_expiracion = models.DateTimeField()
    usado = models.BooleanField(default=False) # este atributo es importante ya que si no se coloca no se sabria si esta usado o no
    
    # clase meta para los diferentes indexes 
    class Meta:
        db_table = 'tokens_verificacion'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['usuario', 'tipo']),
            models.Index(fields=['fecha_expiracion']),
        ]
    
    def __str__(self):
        return f"{self.usuario.usuario} - {self.tipo}"


class Cambio_Email(models.Model):
    """Modelo para gestionar solicitudes de cambio de email (RI-010)"""
    
    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='cambios_email')
    email_anterior = models.EmailField()
    email_nuevo = models.EmailField()
    token = models.ForeignKey(Token_Verificacion, on_delete=models.CASCADE)
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    verificado = models.BooleanField(default=False)
    fecha_verificacion = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'cambios_email'
        indexes = [
            models.Index(fields=['usuario', 'verificado']),
        ]
    
    def __str__(self):
        return f"{self.usuario.usuario}: {self.email_anterior} -> {self.email_nuevo}"


# Clase para ver el estado del usuario actual que este registrado
class Historial_Estado_Usuario(models.Model):
    """Modelo para auditar cambios de estado de usuarios"""
    
    ESTADO_CHOICES = (('Activo', 'Activo'), ('Inactivo', 'Inactivo'),('Bloqueado', 'Bloqueado'),)
    
    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='historial_estados')
    estado_anterior = models.CharField(max_length=20, choices=ESTADO_CHOICES)
    estado_nuevo = models.CharField(max_length=20, choices=ESTADO_CHOICES)
    motivo = models.TextField(null=True, blank=True)
    fecha_cambio = models.DateTimeField(auto_now_add=True)
    admin = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='cambios_estado_realizados')
    
    class Meta:
        db_table = 'historial_estado_usuarios'
        indexes = [
            models.Index(fields=['usuario', 'fecha_cambio']),
        ]


class Log_Auditoria(models.Model):
    """Modelo para registrar todas las acciones administrativas (RI-019)"""
    
    id = models.AutoField(primary_key=True)
    usuario_admin = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True,
                                      related_name='auditorias_realizadas')
    usuario_afectado = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True,
                                         related_name='auditorias_recibidas')
    accion = models.CharField(max_length=255)
    datos_anteriores = models.JSONField(null=True, blank=True)
    datos_nuevos = models.JSONField(null=True, blank=True)
    fecha_accion = models.DateTimeField(auto_now_add=True)
    ip_admin = models.CharField(max_length=45, null=True, blank=True)
    
    class Meta:
        db_table = 'logs_auditoria'
        indexes = [
            models.Index(fields=['usuario_admin', 'fecha_accion']),
            models.Index(fields=['usuario_afectado', 'fecha_accion']),
            models.Index(fields=['fecha_accion']),
        ]
    
    def __str__(self):
        return f"{self.accion} - {self.fecha_accion}"
    