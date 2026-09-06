from django.db import models
from django.core.validators import EmailValidator
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
import secrets


class UsuarioManager(models.Manager):
    def get_by_natural_key(self, correo):
        return self.get(correo__iexact=correo)

    def create_user(self, correo, usuario, password=None, **extra_fields):
        if not correo:
            raise ValueError('El correo es obligatorio.')
        if not usuario:
            raise ValueError('El nombre de usuario es obligatorio.')

        user = self.model(correo=correo.lower(), usuario=usuario, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, correo, usuario, password=None, **extra_fields):
        extra_fields.setdefault('rol', 'Administrador')
        extra_fields.setdefault('estado', 'Activo')
        extra_fields.setdefault('email_verificado', True)
        return self.create_user(correo, usuario, password, **extra_fields)


# Clase de usuarios para el modelo de la base de datos del usuario bien estructurado
# Patron Active Record
class Usuario(models.Model):
    """Modelo unificado de Usuario (RI-001)"""
    # Los diferentes estados que usare en el apartado de usuarios
    ESTADO_CHOICES = (('Activo', 'Activo'), ('Inactivo', 'Inactivo'), ('Bloqueado', 'Bloqueado'),)
    
    # Roles a usar en el usuario 
    ROL_CHOICES = (('Administrador', 'Administrador'), ('Usuario', 'Usuario'),)
    
    # Campos principales
    id = models.AutoField(primary_key=True)
    usuario = models.CharField(max_length=100, unique=True, null=False)
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

    # Campos requeridos por Django para AUTH_USER_MODEL
    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['usuario']
    objects = UsuarioManager()

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

    @property
    def is_staff(self):
        return self.rol == 'Administrador' and not self.eliminado

    @property
    def is_superuser(self):
        return self.is_staff

    def set_password(self, raw_password):
        self.contrasena = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.contrasena)

    # funcion para mostrar en el backend los nombres de usuario y los de correo
    def __str__(self):
        return f"{self.usuario} ({self.correo})"


# Clase para para el modelo del token de verificacion el cual permite recuperar un token y mandarlo a el correo
class Token_Verificacion(models.Model):
    """Modelo para manejar tokens de verificación de email, 
    recuperación de contraseña y cambio de email (RI-009)"""
    
    # Tipo de token el cual se requiera utilizar en el caso de aplicarse
    TIPO_CHOICES = (('Verificacion_Email', 'Verificación de Email'), ('Recuperacion_Password', 'Recuperación de Contraseña'),)
    
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


# -----------------------------------------------------------------------------
# Señal para garantizar que cada usuario registrado tenga su carrito activo
# -----------------------------------------------------------------------------
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Usuario)
def crear_carrito_para_nuevo_usuario(sender, instance, created, **kwargs):
    """
    Señal post_save:
    Cada vez que se crea un nuevo usuario en el sistema (registro o panel admin),
    se inicializa automáticamente su registro de carrito asociado.
    """
    if created:
        from apps.carts.models import Cart
        Cart.objects.get_or_create(user=instance)
    