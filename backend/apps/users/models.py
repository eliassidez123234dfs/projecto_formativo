# ==============================================================================
# Modelos de datos — Módulo de Usuarios (Red Estampación)
# ==============================================================================
# Define los modelos principales del subsistema de usuarios:
#
#   Usuario (RI-001)           → Modelo unificado de autenticación con roles
#                                (Administrador/Usuario), estados (Activo/
#                                Inactivo/Bloqueado), soft-delete y token_version
#                                para invalidación remota de JWT.
#   Token_Verificacion (RI-009) → Token criptográfico para verificación de email,
#                                recuperación de contraseña y cambio de correo.
#   Cambio_Email (RI-010)       → Solicitud de cambio de correo con trazabilidad
#                                del email anterior y nuevo.
#   Historial_Estado_Usuario    → Auditoría de cada transición de estado
#          (RI-018)              (Activo ↔ Inactivo ↔ Bloqueado).
#   Log_Auditoria (RI-019)      → Registro de acciones administrativas con
#                                instantáneas JSON para cumplimiento normativo.
#
# ── Conceptos transversales ──
# * Soft-delete:  los registros NO se borran físicamente de la BD; se marcan
#                 con eliminado=True y se ocultan del sistema activo.
# * token_version: contador que al incrementarse invalida todos los JWT
#                  activos del usuario, forzando una nueva autenticación.
# * Roles:        Administrador (control total del panel de administración) /
#                 Usuario (consumidor final con permisos de compra y perfil).
# * Estados:      Activo (cuenta operativa) / Inactivo (pendiente de verificación
#                 o desactivación voluntaria) / Bloqueado (suspendido por
#                 seguridad o decisión administrativa).
# ==============================================================================

from django.db import models
from django.contrib.auth.models import BaseUserManager
from django.core.validators import EmailValidator
from django.utils import timezone
import secrets


# ── Manager personalizado ──
# Proporciona create_user(), create_superuser() y get_by_natural_key()
# para compatibilidad total con el comando `createsuperuser` y autenticación de Django.
class UsuarioManager(BaseUserManager):
    """Manager personalizado con create_user, create_superuser y get_by_natural_key para compatibilidad con la autenticación de Django."""
    def get_by_natural_key(self, username):
        return self.get(usuario=username)

    def _create_user(self, usuario, correo, password=None, contrasena=None, **extra_fields):
        if not usuario:
            raise ValueError('El campo usuario es obligatorio')
        if not correo:
            raise ValueError('El campo correo es obligatorio')
        pwd = password or contrasena
        usuario_obj = self.model(usuario=usuario, correo=correo, contrasena=pwd, **extra_fields)
        usuario_obj.save(using=self._db)
        return usuario_obj

    def create_user(self, usuario, correo=None, password=None, contrasena=None, **extra_fields):
        extra_fields.setdefault('estado', 'Inactivo')
        extra_fields.setdefault('rol', 'Usuario')
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('email_verificado', False)
        return self._create_user(usuario, correo, password=password, contrasena=contrasena, **extra_fields)

    def create_superuser(self, usuario, correo=None, password=None, contrasena=None, **extra_fields):
        extra_fields.setdefault('estado', 'Activo')
        extra_fields.setdefault('rol', 'Administrador')
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('email_verificado', True)
        return self._create_user(usuario, correo, password=password, contrasena=contrasena, **extra_fields)


# ─────────────────────────────────────────────────────────────────────────────
# Modelo: Usuario (RI-001)
# ─────────────────────────────────────────────────────────────────────────────
# Modelo unificado de autenticación que reemplaza al auth.User de Django.
# Gestiona:
#   - Autenticación por usuario/email + contraseña con hash bcrypt.
#   - Roles: Administrador (control total) / Usuario (consumidor final).
#   - Estados: Activo / Inactivo / Bloqueado (RN-004 para bloqueo por intentos).
#   - Soft-delete: eliminación lógica sin pérdida de datos.
#   - token_version: invalidación remota de JWT al bloquear/desactivar.
#   - Bloqueo automático tras 5 intentos fallidos de inicio de sesión.
#   - Trazabilidad: fecha_registro, fecha_ultima_sesion, fecha_bloqueo.
#   - Superusuario Django (is_superuser): flag independiente del rol,
#     usado exclusivamente para el panel admin de Django.
# ─────────────────────────────────────────────────────────────────────────────
class Usuario(models.Model):
    """Modelo unificado de Usuario (RI-001). Gestiona autenticación, roles (Administrador/Usuario), estados (Activo/Inactivo/Bloqueado), bloqueo por intentos fallidos, soft-delete y token_version para invalidación remota de JWT."""
    
    # ── Ciclo de vida del usuario ──
    # Activo:   cuenta habilitada y operativa.
    # Inactivo: registrado pero sin confirmar email o desactivado voluntariamente.
    # Bloqueado: suspendido por intentos fallidos o por decisión administrativa.
    ESTADO_CHOICES = (('Activo', 'Activo'), ('Inactivo', 'Inactivo'), ('Bloqueado', 'Bloqueado'),)
    
    # ── Roles del sistema ──
    # Administrador: control total del panel de administración y gestión de usuarios.
    # Usuario: consumidor final con permisos de compra, historial y perfil propio.
    ROL_CHOICES = (('Administrador', 'Administrador'), ('Usuario', 'Usuario'),)
    
    # ── Identificación ──
    id = models.AutoField(primary_key=True)
    usuario = models.CharField(max_length=100, unique=True, null=False, verbose_name='username')
    correo = models.EmailField(unique=True, null=False, validators=[EmailValidator()])
    contrasena = models.CharField(max_length=255, null=False)
    
    # ── Estado y rol ──
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Inactivo')
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default='Usuario')
    
    # ── Control de sesión ──
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_ultima_sesion = models.DateTimeField(null=True, blank=True)
    
    # ── Verificación de correo ──
    email_verificado = models.BooleanField(default=False)
    
    # ── Superusuario Django admin ──
    # is_superuser es un flag exclusivo del panel de administración de Django.
    # NO está vinculado al campo `rol`: un Administrador puede no ser superuser
    # y un superuser puede tener rol Usuario.
    is_superuser = models.BooleanField(default=False, verbose_name='Superusuario')

    # ── Token de sesión (invalidación JWT) ──
    # token_version incrementa cada vez que se bloquea o desactiva la cuenta.
    # Los JWT firmados con una versión anterior quedan automáticamente
    # invalidados, forzando al usuario a autenticarse de nuevo.
    token_version = models.IntegerField(default=0, verbose_name='Versión de token')
    
    # ── Bloqueo por seguridad ──
    intentos_fallidos = models.IntegerField(default=0)
    fecha_bloqueo = models.DateTimeField(null=True, blank=True)
    fecha_desbloqueo = models.DateTimeField(null=True, blank=True)
    admin_desbloqueador = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios_desbloqueados')
    
    # ── Eliminación suave (soft delete) ──
    # El usuario no se borra físicamente; `eliminado=True` lo oculta.
    # fecha_eliminacion registra el momento del marcado.
    eliminado = models.BooleanField(default=False)
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)

    # admin_eliminador: FK al admin que marcó la eliminación.
    # Se usa en lugar de una tabla independiente para simplificar el modelo.
    admin_eliminador = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios_eliminados')

    # Use custom manager
    objects = UsuarioManager()

    # Django auth required attributes
    USERNAME_FIELD = 'usuario'
    PASSWORD_FIELD = 'contrasena'
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

    @property
    def is_staff(self):
        return self.is_superuser

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.contrasena)

    def save(self, *args, **kwargs):
        # Auto-hashing de contraseña: si la contraseña no tiene formato
        # de hash (no empieza por el prefijo de PBKDF2/bcrypt/etc), se
        # aplica make_password automáticamente. Esto previene almacenar
        # contraseñas en texto plano si se crea un Usuario fuera de los
        # serializadores (shell, admin, scripts).
        from django.contrib.auth.hashers import make_password, is_password_usable
        if self.contrasena and not is_password_usable(self.contrasena):
            self.contrasena = make_password(self.contrasena)
        self.full_clean()
        super().save(*args, **kwargs)

    # funcion para mostrar en el backend los nombres de usuario y los de correo
    def __str__(self):
        return f"{self.usuario} ({self.correo})"


# ─────────────────────────────────────────────────────────────────────────────
# Modelo: Token_Verificacion (RI-009)
# ─────────────────────────────────────────────────────────────────────────────
# Token criptográfico de un solo uso. Se utiliza en tres flujos distintos:
#
#   1. Verificacion_Email:    confirma la dirección de correo al registrarse
#                              (el usuario nace en estado Inactivo hasta verificar).
#   2. Recuperacion_Password:  permite restablecer la contraseña olvidada
#                              (ventana de expiración: 1 hora, RN-005).
#   3. Cambio_Email:           autoriza la modificación del correo asociado
#                              a la cuenta (RI-010).
#
# Propiedades de seguridad:
#   - token generado con secrets.token_urlsafe (32 bytes, 43 chars base64).
#   - fecha_expiracion: el token deja de ser válido después de esta fecha.
#   - usado (boolean): previene reutilización (token de un solo uso).
#   - Índice compuesto (usuario + tipo) para búsquedas eficientes por flujo.
# ─────────────────────────────────────────────────────────────────────────────
class Token_Verificacion(models.Model):
    """Token de verificación de email, recuperación de contraseña y cambio de email (RI-009). Se usa en tres flujos: confirmación de cuenta, restablecimiento de contraseña y cambio de correo."""
    
    # ── Tipos de token ──
    # Verificacion_Email:   confirma la dirección de correo al registrarse.
    # Recuperacion_Password: permite restablecer la contraseña olvidada.
    # Cambio_Email:         autoriza la modificación del correo asociado.
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


# ─────────────────────────────────────────────────────────────────────────────
# Modelo: Cambio_Email (RI-010)
# ─────────────────────────────────────────────────────────────────────────────
# Solicitud de cambio de dirección de correo electrónico.
#
# Separado de Token_Verificacion para conservar el registro completo del cambio
# (email_anterior → email_nuevo) incluso después de que el token expire o se
# marque como usado. Esto permite:
#   - Trazabilidad forense de cambios de correo.
#   - Revertir el cambio si es necesario.
#   - Notificar al email anterior sobre la modificación.
#
# El flujo completo es:
#   1. Usuario solicita cambio → se crea registro en Cambio_Email + Token.
#   2. Usuario verifica con token → verificado=True, fecha_verificacion.
#   3. El correo del usuario se actualiza al email_nuevo.
# ─────────────────────────────────────────────────────────────────────────────
class Cambio_Email(models.Model):
    """Solicitud de cambio de email (RI-010). Conserva el registro completo del cambio (email anterior → nuevo) y su estado de verificación."""
    
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


# ─────────────────────────────────────────────────────────────────────────────
# Modelo: Historial_Estado_Usuario (RI-018)
# ─────────────────────────────────────────────────────────────────────────────
# Auditoría de cambios de estado del usuario. Cada transición entre
# Activo / Inactivo / Bloqueado se registra con:
#   - estado_anterior / estado_nuevo: los valores antes y después del cambio.
#   - motivo: texto libre que justifica la transición.
#   - admin: FK al administrador que ejecutó el cambio (SET_NULL si se elimina).
#   - fecha_cambio: timestamp automático de la transición.
#
# Propósito: formar una traza de auditoría completa, no repudiable y con
# responsibleabilidad (quién cambió, cuándo, por qué y a qué estado).
#
# Restricciones de negocio:
#   - RN-021: cada cambio de estado DEBE registrarse en este modelo.
#   - RN-022: al bloquear/desactivar se incrementa token_version del usuario.
# ─────────────────────────────────────────────────────────────────────────────
class Historial_Estado_Usuario(models.Model):
    """Auditoría de cambios de estado (Activo/Inactivo/Bloqueado) de usuarios (RI-018). Cada transición se registra con admin responsable, motivo y timestamp."""
    
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


# ─────────────────────────────────────────────────────────────────────────────
# Modelo: Log_Auditoria (RI-019)
# ─────────────────────────────────────────────────────────────────────────────
# Registro de auditoría para acciones administrativas sobre usuarios.
# Complementa a Historial_Estado_Usuario capturando acciones más complejas
# como creación, edición, eliminación lógica y reseteo de contraseña.
#
# Campos clave:
#   - datos_anteriores / datos_nuevos: JSON con instantáneas del estado previo
#     y posterior a la acción. Permite reconstruir el cambio exacto.
#   - ip_admin: dirección IP del administrador que ejecutó la acción
#     (soporta IPv4 e IPv6, campo de 45 caracteres).
#   - fecha_accion: timestamp automático de la acción.
#
# Cumplimiento normativo: esta traza satisface requerimientos de auditoría
# forense, permitiendo responder "quién hizo qué, cuándo y desde dónde".
#
# Restricciones:
#   - RN-026: toda acción administrativa DEBE generar un registro aquí.
# ─────────────────────────────────────────────────────────────────────────────
class Log_Auditoria(models.Model):
    """Registro de auditoría para acciones administrativas sobre usuarios (RI-019). Almacena instantáneas JSON del estado anterior/posterior, IP del admin y timestamp para cumplimiento normativo y trazabilidad forense."""
    
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
    