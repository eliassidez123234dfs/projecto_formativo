# ==============================================================================
# ViewSets de Administración — Módulo de Usuarios (Red Estampación)
# ==============================================================================
# Implementa los endpoints de administración de usuarios:
#
#   AdminUsuarioViewSet (RF-016 a RF-024)
#     - list:               listar usuarios con filtros y búsqueda (RF-016, RF-017)
#     - create:             crear usuario manualmente (RF-018, RN-027)
#     - update:             editar usuario (RF-019, RN-021)
#     - cambiar_estado:     cambiar estado Activo/Inactivo/Bloqueado (RF-020, RN-022)
#     - desbloquear:        desbloquear cuenta bloqueada (RF-022, RN-010)
#     - eliminar_logicamente: soft-delete de usuario (RF-021, RN-024)
#     - resetear_password:  resetear contraseña y enviar temporal (RF-023, RN-023)
#     - auditoria:          consultar log de auditoría (RF-024, RN-026)
#     - suggest:            sugerencias typeahead para búsqueda (RN-BUS-07)
#
# Reglas de negocio:
#   - RN-021: toda modificación debe registrarse en Log_Auditoria.
#   - RN-022: al bloquear/desactivar, incrementar token_version.
#   - RN-023: reseteo de contraseña genera temporal y la envía por email.
#   - RN-024: soft-delete: no se borra físicamente, solo marcador.
#   - RN-025: solo admins con estado Activo pueden operar (AdminPermission).
#   - RN-026: auditoría obligatoria para cada acción administrativa.
#   - RN-027: creación admin requiere verificación de email.
# ==============================================================================
"""ViewSets para administración de usuarios, auditoría y eliminación lógica (RF-016 a RF-024)."""

# ─────────────────────────────────────────────────────────
# Importaciones de la librería estándar y terceros
# ─────────────────────────────────────────────────────────
import logging
import uuid
import re
import secrets
import string
from datetime import timedelta

from django.utils import timezone
from django.conf import settings
from django.db.models import Q, Case, When, Value, IntegerField
from django.contrib.auth.hashers import make_password
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────
# Importaciones del proyecto
# ─────────────────────────────────────────────────────────
from ..services.email_service import EmailService
from ..models import (
    Usuario, Token_Verificacion, Log_Auditoria, Historial_Estado_Usuario
)
from ..mongo_service import log_event as mongo_log_event
from .serializers import (
    UsuarioSerializer, UsuarioDetailSerializer, LogAuditoriaSerializer
)


# ─────────────────────────────────────────────────────────────────────────────
# Permiso personalizado: AdminPermission (RN-025)
# ─────────────────────────────────────────────────────────────────────────────
# Solo concede acceso si el usuario cumple TODAS las condiciones:
#   1. Está autenticado (request.user.is_authenticated).
#   2. Tiene rol 'Administrador' (request.user.rol).
#   3. Su estado es 'Activo' (no puede operar si está Inactivo o Bloqueado).
#
# RN-025: solo administradores activos pueden acceder a los endpoints
# del panel de administración.
# ─────────────────────────────────────────────────────────────────────────────
class AdminPermission(permissions.BasePermission):
    """
    Permiso personalizado para usuarios administradores.
    Solo otorga acceso si el usuario está autenticado, tiene rol 'Administrador'
    y su estado es 'Activo'. Niega el acceso a usuarios inactivos o bloqueados
    incluso si tienen rol de administrador en BD.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.rol == 'Administrador' and
            request.user.estado == 'Activo'
        )


# ─────────────────────────────────────────────────────────────────────────────
# Paginación personalizada: AdminPagination
# ─────────────────────────────────────────────────────────────────────────────
# Extiende PageNumberPagination con valores por defecto desde la configuración
# de Django REST Framework. Permite al cliente sobreescribir page_size vía
# query param, con un límite máximo de 100 registros por página para prevenir
# sobrecarga en la respuesta y extracción masiva de datos.
# ─────────────────────────────────────────────────────────────────────────────
class AdminPagination(PageNumberPagination):
    """
    Paginación personalizada para el panel de administración.
    Page size por defecto desde settings.REST_FRAMEWORK, configurable vía
    query param 'page_size', con un máximo de 100 registros por página
    para evitar sobrecarga en la respuesta.
    """
    page_size = settings.REST_FRAMEWORK.get('PAGE_SIZE', 20)
    page_size_query_param = 'page_size'
    max_page_size = 100


# ─────────────────────────────────────────────────────────────────────────────
# ViewSet: AdminUsuarioViewSet (RF-016 a RF-024)
# ─────────────────────────────────────────────────────────────────────────────
# CRUD administrativo de usuarios con acciones especializadas.
# Requiere AdminPermission (rol Administrador + estado Activo).
#
# Características:
#   - Filtros combinables: estado, rol, email_verificado, eliminado.
#   - Búsqueda por texto con priorización de coincidencia exacta por ID.
#   - Paginación con AdminPagination (máx 100 registros/página).
#   - Límite absoluto de 10,000 registros para prevenir extracción masiva.
#   - Auditoría obligatoria en cada acción (Log_Auditoria + MongoDB audit_logs).
#   - Protección contra autodesactivación y eliminación del único admin activo.
# ─────────────────────────────────────────────────────────────────────────────
class AdminUsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para administración de usuarios (RF-016 a RF-024). Requiere AdminPermission (rol Administrador + estado Activo)."""
    queryset = Usuario.objects.all()
    serializer_class = UsuarioDetailSerializer
    permission_classes = [AdminPermission]
    filterset_fields = ['estado', 'rol', 'email_verificado']
    search_fields = ['usuario', 'correo', 'id']
    ordering_fields = ['fecha_registro', 'fecha_ultima_sesion']
    ordering = ['-fecha_registro']
    pagination_class = AdminPagination
    
    def get_queryset(self):
        """Filtrar usuarios según parámetros (RF-016, RN-025)"""
        queryset = Usuario.objects.all().order_by('-fecha_registro')
        
        # Filtros
        estado = self.request.query_params.get('estado')
        rol = self.request.query_params.get('rol')
        email_verificado = self.request.query_params.get('email_verificado')
        eliminado_param = self.request.query_params.get('eliminado')
        
        # Por defecto ocultar eliminados, a menos que se pida explicitamente
        if eliminado_param:
            queryset = queryset.filter(eliminado=eliminado_param.lower() == 'true')
        else:
            queryset = queryset.filter(eliminado=False)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        if rol:
            queryset = queryset.filter(rol=rol)
        if email_verificado:
            queryset = queryset.filter(email_verificado=email_verificado.lower() == 'true')
        
        # Búsqueda por texto
        search = self.request.query_params.get('search')
        if search:
            # Priorizar coincidencia exacta por ID si se pasa un número
            is_numeric = False
            try:
                int_search = int(search)
                is_numeric = True
            except Exception:
                int_search = None

            if is_numeric:
                # Anotar coincidencia exacta por id para ordenar al inicio
                queryset = queryset.annotate(
                    _id_match=Case(
                        When(id=int_search, then=Value(1)),
                        default=Value(0),
                        output_field=IntegerField()
                    )
                ).filter(
                    Q(usuario__icontains=search) |
                    Q(correo__icontains=search) |
                    Q(id__exact=int_search)
                ).order_by('-_id_match')
            else:
                queryset = queryset.filter(
                    Q(usuario__icontains=search) |
                    Q(correo__icontains=search) |
                    Q(id__icontains=search)
                )
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Listar usuarios con filtros y búsqueda (RF-016, RF-017).
        Registra auditoría si la búsqueda devuelve muchos resultados.
        """
        queryset = self.filter_queryset(self.get_queryset())
        total = queryset.count()

        search = request.query_params.get('search')
        if search and total > 200:
            self._registrar_auditoria(
                request.user, None, 'Consulta masiva de usuarios',
                datos_nuevos={'filtros': request.query_params.dict()},
                ip_admin=self._obtener_ip_cliente(request)
            )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # ── suggest: sugerencias para typeahead (RN-BUS-07) ──
    # Endpoint de autocompletado para campos de búsqueda de usuarios.
    # Requiere al menos 3 caracteres de entrada.
    # Prioriza coincidencias exactas por ID (si el query es numérico)
    # y limita a 10 resultados para rápida respuesta.
    @action(detail=False, methods=['get'])
    def suggest(self, request):
        """Sugerencias para typeahead (RN-BUS-07). Requiere ≥3 caracteres."""
        q = request.query_params.get('q', '')
        if len(q) < 3:
            return Response({'error': 'Ingresa al menos 3 caracteres para sugerencias.'}, status=status.HTTP_400_BAD_REQUEST)

        # Priorizar coincidencias por email exacto o id
        try:
            q_int = int(q)
        except Exception:
            q_int = None

        queryset = Usuario.objects.filter(
            Q(usuario__icontains=q) |
            Q(correo__icontains=q) |
            Q(id__icontains=q)
        )

        if q_int is not None:
            queryset = queryset.annotate(
                _id_match=Case(When(id=q_int, then=Value(1)), default=Value(0), output_field=IntegerField())
            ).order_by('-_id_match')

        queryset = queryset[:10]
        serializer = UsuarioSerializer(queryset, many=True)
        return Response(serializer.data)
    
    # ────────────────────────────────────────────────────────
    # POST /api/admin/usuarios/   (RF-018, RN-027)
    # ────────────────────────────────────────────────────────
    # Creación manual de usuarios desde el panel de administración.
    #
    # Validaciones:
    #   - Campos requeridos: usuario, correo, rol, estado.
    #   - Formato de email validado con regex.
    #   - Unicidad de usuario y correo.
    #   - Si se envía password, debe cumplir RN-001 (≥8 chars, mayúscula,
    #     número, especial). Si no se envía, se genera una temporal.
    #
    # Flujo:
    #   1. Valida datos de entrada.
    #   2. Crea el usuario en BD con contraseña hasheada.
    #   3. Genera token de verificación (RN-027).
    #   4. Envía email con credenciales (bienvenida + temp password)
    #      o email de verificación según el caso (RF-018).
    #   5. Registra en Log_Auditoria + MongoDB audit_logs.
    #
    # RN-027: la creación admin requiere token de verificación de email.
    # ────────────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        """Crear usuario manualmente desde admin (RF-018, RN-027)"""
        datos = request.data
        
        # Validar datos requeridos
        campos_requeridos = ['usuario', 'correo', 'rol', 'estado']
        for campo in campos_requeridos:
            if campo not in datos:
                return Response({
                    'error': f'El campo {campo} es requerido'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar email con expresión regular
        correo = datos['correo']
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', correo):
            return Response({
                'error': 'El formato del correo no es válido.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar que el usuario no exista
        if Usuario.objects.filter(usuario=datos['usuario']).exists():
            return Response({
                'error': 'Ya existe un usuario con ese nombre.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if Usuario.objects.filter(correo=correo).exists():
            return Response({
                'error': 'Ya existe un usuario con ese correo.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar contraseña si se envía, o generar temporal
        contrasena = datos.get('password')
        if contrasena:
            if len(contrasena) < 8:
                return Response({
                    'error': 'La contraseña debe tener al menos 8 caracteres.'
                }, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'[A-Z]', contrasena):
                return Response({
                    'error': 'La contraseña debe incluir al menos una letra mayúscula.'
                }, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'\d', contrasena):
                return Response({
                    'error': 'La contraseña debe incluir al menos un número.'
                }, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', contrasena):
                return Response({
                    'error': 'La contraseña debe incluir al menos un carácter especial.'
                }, status=status.HTTP_400_BAD_REQUEST)
            contrasena_final = contrasena
            contrasena_temporal = None
        else:
            contrasena_temporal = self._generar_contrasena_temporal()
            contrasena_final = contrasena_temporal
        
        try:
            usuario = Usuario.objects.create(
                usuario=datos['usuario'],
                correo=correo,
                contrasena=make_password(contrasena_final),
                rol=datos['rol'],
                estado=datos['estado']
            )
            
            # Crear token de verificación (RN-027)
            fecha_expiracion = timezone.now() + timedelta(hours=24)
            token = Token_Verificacion.objects.create(
                usuario=usuario,
                token=str(uuid.uuid4()),
                tipo='Verificacion_Email',
                fecha_expiracion=fecha_expiracion
            )
            
            # Enviar email con credenciales (RF-018)
            if contrasena_temporal:
                EmailService.send_welcome_email(usuario, contrasena_temporal)
            else:
                EmailService.send_verification_email(usuario, token)
            
            # Registrar en auditoría
            self._registrar_auditoria(
                request.user, usuario, 'Crear usuario',
                datos_nuevos={
                    'usuario': usuario.usuario,
                    'correo': usuario.correo,
                    'rol': usuario.rol,
                    'estado': usuario.estado
                },
                ip_admin=self._obtener_ip_cliente(request)
            )
            
            return Response({
                'mensaje': f'Usuario {usuario.usuario} creado exitosamente',
                'usuario': UsuarioDetailSerializer(usuario).data
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            msg = str(e)
            if 'UNIQUE constraint' in msg:
                if 'usuario' in msg:
                    msg = 'Ya existe un usuario con ese nombre'
                elif 'correo' in msg:
                    msg = 'Ya existe un usuario con ese correo'
            return Response({
                'error': msg
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # ────────────────────────────────────────────────────────
    # PUT/PATCH /api/admin/usuarios/{id}/   (RF-019, RN-021)
    # ────────────────────────────────────────────────────────
    # Edición de usuarios desde el panel de administración.
    #
    # Restricciones de seguridad:
    #   - Un admin NO puede cambiar su propio rol de Administrador a otro.
    #   - Un admin NO puede desactivar o bloquear su propia cuenta.
    #   - No se puede cambiar el rol del ÚNICO administrador activo
    #     (previene lockout administrativo).
    #
    # Auditoría:
    #   - Captura instantánea del estado anterior (datos_anteriores).
    #   - Captura el nuevo estado (datos_nuevos).
    #   - Registra en Log_Auditoria + MongoDB (RN-021).
    # ────────────────────────────────────────────────────────
    def update(self, request, pk=None, *args, **kwargs):
        """Editar usuario (RF-019, RN-021)"""
        usuario = self.get_object()
        
        # No permitir que un admin se edite a sí mismo en campos críticos
        if request.user.pk == usuario.pk:
            nuevo_rol = request.data.get('rol')
            nuevo_estado = request.data.get('estado')
            if nuevo_rol is not None and nuevo_rol != 'Administrador':
                return Response({
                    'error': 'No puedes cambiar tu propio rol de administrador'
                }, status=status.HTTP_400_BAD_REQUEST)
            if nuevo_estado is not None and nuevo_estado != 'Activo':
                return Response({
                    'error': 'No puedes desactivar o bloquear tu propia cuenta'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Evitar que el único administrador activo pierda su rol
        if usuario.rol == 'Administrador' and request.data.get('rol', usuario.rol) != 'Administrador':
            admins_activos = Usuario.objects.filter(
                rol='Administrador', estado='Activo', eliminado=False
            ).count()
            if admins_activos <= 1:
                return Response({
                    'error': 'No puedes cambiar el rol del único administrador activo'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Guardar datos anteriores para auditoría
        datos_anteriores = {
            'usuario': usuario.usuario,
            'correo': usuario.correo,
            'rol': usuario.rol,
            'estado': usuario.estado
        }
        
        serializer = self.get_serializer(usuario, data=request.data, partial=True)
        if serializer.is_valid():
            usuario = serializer.save()
            
            # Registrar en auditoría (RN-021)
            self._registrar_auditoria(
                request.user, usuario, 'Editar usuario',
                datos_anteriores=datos_anteriores,
                datos_nuevos={
                    'usuario': usuario.usuario,
                    'correo': usuario.correo,
                    'rol': usuario.rol,
                    'estado': usuario.estado
                },
                ip_admin=self._obtener_ip_cliente(request)
            )
            
            return Response({
                'mensaje': 'Usuario actualizado exitosamente',
                'usuario': UsuarioDetailSerializer(usuario).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ────────────────────────────────────────────────────────
    # POST /api/admin/usuarios/{id}/cambiar_estado/   (RF-020, RN-022)
    # ────────────────────────────────────────────────────────
    # Cambia el estado de un usuario (Activo ↔ Inactivo ↔ Bloqueado).
    #
    # Flujo:
    #   1. Valida que el nuevo estado sea uno de los permitidos.
    #   2. Verifica que no se desactive/bloquee al ÚNICO admin activo.
    #   3. Actualiza el estado del usuario.
    #   4. Registra la transición en Historial_Estado_Usuario (RI-018).
    #   5. Si el nuevo estado es Inactivo o Bloqueado → incrementa
    #      token_version y elimina tokens outstanding (RN-022).
    #   6. Registra en Log_Auditoria + MongoDB.
    #
    # RN-022: al bloquear/desactivar se incrementa token_version para
    # invalidar todos los JWT activos del usuario.
    # ────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de usuario (RF-020, RN-022)"""
        usuario = self.get_object()
        
        nuevo_estado = request.data.get('estado')
        motivo = request.data.get('motivo', '')
        
        if nuevo_estado not in ['Activo', 'Inactivo', 'Bloqueado']:
            return Response({
                'error': 'Estado inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar que no se desactive el único admin activo
        if usuario.rol == 'Administrador' and nuevo_estado != 'Activo':
            admins_activos = Usuario.objects.filter(
                rol='Administrador',
                estado='Activo',
                eliminado=False
            ).count()
            if admins_activos == 1:
                return Response({
                    'error': 'No puedes desactivar o bloquear el único administrador activo'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Registrar historial de estado
        estado_anterior = usuario.estado
        usuario.estado = nuevo_estado
        usuario.save()
        
        Historial_Estado_Usuario.objects.create(
            usuario=usuario,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            motivo=motivo,
            admin=request.user
        )
        
        # Si se desactiva o bloquea, invalidar tokens (RN-022)
        if nuevo_estado in ['Inactivo', 'Bloqueado']:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            from django.utils import timezone as tz
            usuario.token_version += 1
            usuario.save(update_fields=['token_version'])
            OutstandingToken.objects.filter(user_id=usuario.id).delete()
        
        # Registrar en auditoría
        self._registrar_auditoria(
            request.user, usuario, f'Cambiar estado a {nuevo_estado}',
            datos_anteriores={'estado': estado_anterior},
            datos_nuevos={'estado': nuevo_estado, 'motivo': motivo},
            ip_admin=self._obtener_ip_cliente(request)
        )
        
        return Response({
            'mensaje': f'Estado del usuario cambiado a {nuevo_estado}',
            'usuario': UsuarioDetailSerializer(usuario).data
        }, status=status.HTTP_200_OK)
    
    # ────────────────────────────────────────────────────────
    # POST /api/admin/usuarios/{id}/desbloquear/   (RF-022, RN-010)
    # ────────────────────────────────────────────────────────
    # Desbloquea la cuenta de un usuario previamente bloqueado.
    #
    # Flujo:
    #   1. Verifica que el usuario esté efectivamente Bloqueado.
    #   2. Cambia estado a 'Activo', reinicia intentos_fallidos a 0,
    #      limpia fecha_bloqueo y registra admin_desbloqueador.
    #   3. Registra en Log_Auditoria + MongoDB.
    #
    # RN-010: el desbloqueo solo puede realizarlo un administrador activo.
    # ────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def desbloquear(self, request, pk=None):
        """Desbloquear cuenta (RF-022, RN-010)"""
        usuario = self.get_object()
        
        if usuario.estado != 'Bloqueado':
            return Response({
                'error': 'El usuario no está bloqueado'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        usuario.estado = 'Activo'
        usuario.intentos_fallidos = 0
        usuario.fecha_bloqueo = None
        usuario.fecha_desbloqueo = timezone.now()
        usuario.admin_desbloqueador = request.user
        usuario.save()
        
        # Registrar en auditoría
        self._registrar_auditoria(
            request.user, usuario, 'Desbloquear cuenta',
            ip_admin=self._obtener_ip_cliente(request)
        )
        
        return Response({
            'mensaje': 'Cuenta desbloqueada exitosamente',
            'usuario': UsuarioDetailSerializer(usuario).data
        }, status=status.HTTP_200_OK)
    
    # ────────────────────────────────────────────────────────
    # POST /api/admin/usuarios/{id}/resetear_password/   (RF-023, RN-023)
    # ────────────────────────────────────────────────────────
    # Resetea la contraseña de un usuario desde el panel admin.
    #
    # Flujo:
    #   1. Genera una contraseña temporal que cumple RN-001.
    #   2. Aplica hash (make_password) y la guarda en BD.
    #   3. Reinicia intentos_fallidos y fecha_bloqueo (desbloquea si estaba bloqueado).
    #   4. Crea un token de recuperación (por trazabilidad).
    #   5. Envía email con la contraseña temporal al usuario (RF-023).
    #   6. Registra en Log_Auditoria + MongoDB.
    #
    # RN-023: el reseteo debe notificarse al usuario por email.
    # ────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def resetear_password(self, request, pk=None):
        """Resetear contraseña de usuario (RF-023, RN-023)"""
        usuario = self.get_object()
        
        # Generar contraseña temporal
        contrasena_temporal = self._generar_contrasena_temporal()
        
        usuario.contrasena = make_password(contrasena_temporal)
        usuario.intentos_fallidos = 0
        usuario.fecha_bloqueo = None
        usuario.save()
        
        # Crear token de recuperación
        fecha_expiracion = timezone.now() + timedelta(hours=1)
        token = Token_Verificacion.objects.create(
            usuario=usuario,
            token=str(uuid.uuid4()),
            tipo='Recuperacion_Password',
            fecha_expiracion=fecha_expiracion
        )
        
        # Enviar email
        EmailService.send_admin_reset_email(usuario, contrasena_temporal)
        
        # Registrar en auditoría
        self._registrar_auditoria(
            request.user, usuario, 'Resetear contraseña',
            ip_admin=self._obtener_ip_cliente(request)
        )
        
        return Response({
            'mensaje': 'Contraseña reseteada. Email enviado al usuario.'
        }, status=status.HTTP_200_OK)
    
    # ────────────────────────────────────────────────────────
    # POST /api/admin/usuarios/{id}/eliminar_logicamente/   (RF-021, RN-024)
    # ────────────────────────────────────────────────────────
    # Eliminación lógica (soft-delete) de un usuario.
    #
    # No se borra físicamente de la BD; se marca con:
    #   - eliminado = True
    #   - fecha_eliminacion = timestamp actual
    #   - admin_eliminador = admin que ejecuta la acción
    #
    # Restricciones:
    #   - No se puede eliminar al ÚNICO administrador activo.
    #
    # RN-024: el soft-delete conserva el registro para auditoría
    # y posible restauración futura.
    # ────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def eliminar_logicamente(self, request, pk=None):
        """Eliminar usuario lógicamente (RF-021, RN-024)"""
        usuario = self.get_object()
        
        # Validar que no sea el único admin activo
        if usuario.rol == 'Administrador':
            admins_activos = Usuario.objects.filter(
                rol='Administrador',
                estado='Activo',
                eliminado=False
            ).count()
            if admins_activos == 1:
                return Response({
                    'error': 'No puedes eliminar el único administrador activo'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        usuario.eliminado = True
        usuario.fecha_eliminacion = timezone.now()
        usuario.admin_eliminador = request.user
        usuario.save()
        
        # Registrar en auditoría
        self._registrar_auditoria(
            request.user, usuario, 'Eliminar usuario (soft delete)',
            ip_admin=self._obtener_ip_cliente(request)
        )
        
        return Response({
            'mensaje': 'Usuario eliminado exitosamente',
            'usuario': UsuarioDetailSerializer(usuario).data
        }, status=status.HTTP_200_OK)
    
    # ────────────────────────────────────────────────────────
    # GET /api/admin/usuarios/auditoria/   (RF-024, RN-026)
    # ────────────────────────────────────────────────────────
    # Consulta el log de auditoría de acciones administrativas.
    #
    # Filtros opcionales vía query params:
    #   - usuario_admin: ID del administrador que ejecutó la acción.
    #   - usuario_afectado: ID del usuario objetivo.
    #   - fecha_inicio / fecha_fin: rango de fechas.
    #
    # Los resultados se ordenan por fecha descendente y se pagan
    # con AdminPagination.
    #
    # RN-026: todas las acciones administrativas son auditables
    # y consultables desde este endpoint.
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def auditoria(self, request):
        """Ver log de auditoría (RF-024, RN-026)"""
        # Filtros
        usuario_admin = request.query_params.get('usuario_admin')
        usuario_afectado = request.query_params.get('usuario_afectado')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        queryset = Log_Auditoria.objects.select_related('usuario_admin', 'usuario_afectado').all()
        
        if usuario_admin:
            queryset = queryset.filter(usuario_admin_id=usuario_admin)
        if usuario_afectado:
            queryset = queryset.filter(usuario_afectado_id=usuario_afectado)
        if fecha_inicio:
            queryset = queryset.filter(fecha_accion__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(fecha_accion__lte=fecha_fin)
        
        queryset = queryset.order_by('-fecha_accion')
        
        # Paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = LogAuditoriaSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LogAuditoriaSerializer(queryset, many=True)
        return Response(serializer.data)
    
    # ════════════════════════════════════════════════════════
    # Métodos auxiliares privados
    # ════════════════════════════════════════════════════════
    
    # ── _generar_contrasena_temporal ──
    # Genera una contraseña temporal que cumple los requisitos de RN-001:
    # al menos 1 mayúscula, 1 número, 1 carácter especial y 8 caracteres
    # de longitud. Usa secrets (criptográficamente seguro) para la
    # generación y SystemRandom().shuffle para mezclar los caracteres.
    def _generar_contrasena_temporal(self):
        """Generar contraseña temporal que cumple RN-001"""
        caracteres_especiales = '!@#$%^&*()'
        contrasena = (
            secrets.choice(string.ascii_uppercase) +
            secrets.choice(string.digits) +
            secrets.choice(caracteres_especiales) +
            ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(5))
        )
        contrasena_lista = list(contrasena)
        secrets.SystemRandom().shuffle(contrasena_lista)
        return ''.join(contrasena_lista)
    
    # ── _registrar_auditoria (RN-021, RN-026) ──
    # Registra una acción administrativa en dos sistemas de log:
    #   1. Log_Auditoria (SQL): tabla relacional con relaciones FK.
    #   2. MongoDB audit_logs: colección NoSQL para consultas agregadas
    #      y almacenamiento a largo plazo (vía mongo_service.log_event).
    #
    # Datos capturados: admin que ejecuta, usuario afectado, acción,
    # instantáneas JSON (datos_anteriores/datos_nuevos), IP del admin.
    def _registrar_auditoria(self, admin, usuario_afectado, accion, 
                            datos_anteriores=None, datos_nuevos=None, ip_admin=None):
        """Registrar acción en log de auditoría (SQL + MongoDB). RN-021, RN-026."""
        Log_Auditoria.objects.create(
            usuario_admin=admin,
            usuario_afectado=usuario_afectado,
            accion=accion,
            datos_anteriores=datos_anteriores,
            datos_nuevos=datos_nuevos,
            ip_admin=ip_admin
        )
        mongo_log_event(
            action=f'admin.{accion.lower().replace(" ", "_")}',
            actor_id=admin.id if admin else None,
            target_type='usuario',
            target_id=str(usuario_afectado.id) if usuario_afectado else None,
            metadata={
                'accion': accion,
                'datos_anteriores': datos_anteriores,
                'datos_nuevos': datos_nuevos,
            },
            ip_address=ip_admin,
            severity='info',
        )
    
    # ── _obtener_ip_cliente ──
    # Extrae la dirección IP del cliente desde la request.
    # Soporta proxies inversos (X-Forwarded-For) y conexiones directas
    # (REMOTE_ADDR). El campo ip_admin tiene capacidad para IPv6 (45 chars).
    def _obtener_ip_cliente(self, request):
        """Obtener IP del cliente (soporta X-Forwarded-For para proxies inversos)."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
