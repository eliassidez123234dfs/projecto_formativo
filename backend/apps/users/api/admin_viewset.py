import logging

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q, Case, When, Value, IntegerField
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth.hashers import make_password
import uuid
from datetime import timedelta
import secrets
import string
import re

logger = logging.getLogger(__name__)

from ..models import (
    Usuario, Token_Verificacion, Log_Auditoria, Historial_Estado_Usuario
)
from .serializers import (
    UsuarioSerializer, UsuarioDetailSerializer, LogAuditoriaSerializer
)


class AdminPermission(permissions.BasePermission):
    """Permiso personalizado para usuarios administradores"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.rol == 'Administrador' and
            request.user.estado == 'Activo'
        )


class AdminPagination(PageNumberPagination):
    page_size = settings.REST_FRAMEWORK.get('PAGE_SIZE', 20)
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminUsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para administración de usuarios (RF-016 a RF-024)"""
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
        queryset = Usuario.objects.all()
        
        # Filtros
        estado = self.request.query_params.get('estado')
        rol = self.request.query_params.get('rol')
        email_verificado = self.request.query_params.get('email_verificado')
        eliminado = self.request.query_params.get('eliminado')
        
        if estado:
            queryset = queryset.filter(estado=estado)
        if rol:
            queryset = queryset.filter(rol=rol)
        if email_verificado:
            queryset = queryset.filter(email_verificado=email_verificado.lower() == 'true')
        if eliminado:
            queryset = queryset.filter(eliminado=eliminado.lower() == 'true')
        
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
        Registra auditoría y protege contra extracción masiva.
        """
        queryset = self.filter_queryset(self.get_queryset())

        total = queryset.count()

        # Límite total absoluto para prevenir extracción masiva
        MAX_TOTAL = 10000
        if total > MAX_TOTAL:
            return Response({
                'error': f'Refina los filtros. La consulta devuelve {total} registros (máx {MAX_TOTAL}).'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si es una búsqueda que devuelve muchos resultados, registrar en auditoría
        search = request.query_params.get('search')
        if search and total > 200:
            self._registrar_auditoria(
                request.user, None, 'Consulta masiva de usuarios',
                datos_nuevos={'filtros': request.query_params.dict()},
                ip_admin=self._obtener_ip_cliente(request)
            )

        # Control mínimo de page_size si es provisto
        page_size_param = request.query_params.get(self.pagination_class.page_size_query_param)
        if page_size_param:
            try:
                ps = int(page_size_param)
                if ps < 5:
                    # Forzar mínimo
                    request.GET._mutable = True
                    request.GET[self.pagination_class.page_size_query_param] = '5'
                    request.GET._mutable = False
            except Exception:
                pass

        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def suggest(self, request):
        """Sugerencias para typeahead (RN-BUS-07). Requiere >=3 caracteres."""
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
                self._enviar_email_bienvenida(usuario, contrasena_temporal, token.token)
            else:
                self._enviar_email_verificacion(usuario, token.token)
            
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
    
    def update(self, request, pk=None, *args, **kwargs):
        """Editar usuario (RF-019)"""
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
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de usuario (RF-020)"""
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
            # Aquí se implementaría la invalidación de tokens JWT
            # Usando django-rest-framework-simplejwt token blacklist
            pass
        
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
        self._enviar_email_reset_password(usuario, contrasena_temporal, token.token)
        
        # Registrar en auditoría
        self._registrar_auditoria(
            request.user, usuario, 'Resetear contraseña',
            ip_admin=self._obtener_ip_cliente(request)
        )
        
        return Response({
            'mensaje': 'Contraseña reseteada. Email enviado al usuario.'
        }, status=status.HTTP_200_OK)
    
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
    
    @action(detail=False, methods=['get'])
    def auditoria(self, request):
        """Ver log de auditoría (RF-024)"""
        # Filtros
        usuario_admin = request.query_params.get('usuario_admin')
        usuario_afectado = request.query_params.get('usuario_afectado')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        queryset = Log_Auditoria.objects.all()
        
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
    
    # Métodos auxiliares
    
    def _generar_contrasena_temporal(self):
        """Generar contraseña temporal que cumple RN-001"""
        caracteres_especiales = '!@#$%^&*()'
        mientras = True
        while mientras:
            contrasena = ''
            
            # Agregar mayúsculas
            contrasena += secrets.choice(string.ascii_uppercase)
            
            # Agregar número
            contrasena += secrets.choice(string.digits)
            
            # Agregar carácter especial
            contrasena += secrets.choice(caracteres_especiales)
            
            # Completar el resto
            resto = secrets.choice(string.ascii_letters + string.digits + caracteres_especiales)
            contrasena += ''.join(
                secrets.choice(string.ascii_letters + string.digits) 
                for _ in range(5)
            )
            
            # Mezclar
            contrasena_lista = list(contrasena)
            secrets.SystemRandom().shuffle(contrasena_lista)
            contrasena = ''.join(contrasena_lista)
            
            mientras = False
        
        return contrasena
    
    def _enviar_email_bienvenida(self, usuario, contrasena_temporal, token):
        """Enviar email de bienvenida con credenciales"""
        enlace = f"{settings.BACKEND_URL}/api/auth/verificar-email/?token={token}"
        asunto = "Bienvenido - Tu cuenta ha sido creada"
        mensaje = f"""
        Hola {usuario.usuario},
        
        Tu cuenta ha sido creada por un administrador.
        
        Credenciales temporales:
        Correo: {usuario.correo}
        Contraseña: {contrasena_temporal}
        
        Por favor, verifica tu correo haciendo clic en el siguiente enlace:
        {enlace}
        
        Después podrás cambiar tu contraseña.
        """
        
        try:
            send_mail(
                asunto,
                mensaje,
                settings.DEFAULT_FROM_EMAIL,
                [usuario.correo],
                fail_silently=False
            )
        except Exception as exc:
            logger.exception('Error al enviar email de bienvenida a %s: %s', usuario.correo, exc)
    
    def _enviar_email_verificacion(self, usuario, token):
        """Enviar email de verificación cuando el admin crea usuario con password propia"""
        enlace = f"{settings.BACKEND_URL}/api/auth/verificar-email/?token={token}"
        asunto = "Verifica tu correo electrónico"
        mensaje = f"""
        Hola {usuario.usuario},
        
        Tu cuenta ha sido creada por un administrador.
        
        Por favor, verifica tu correo haciendo clic en el siguiente enlace:
        {enlace}
        
        Este enlace expira en 24 horas.
        """
        
        try:
            send_mail(
                asunto,
                mensaje,
                settings.DEFAULT_FROM_EMAIL,
                [usuario.correo],
                fail_silently=False
            )
        except Exception as exc:
            logger.exception('Error al enviar email de verificación a %s: %s', usuario.correo, exc)
    
    def _enviar_email_reset_password(self, usuario, contrasena_temporal, token):
        """Enviar email de reseteo de contraseña"""
        enlace = f"{settings.FRONTEND_URL}/nueva-password?token={token}"
        asunto = "Tu contraseña ha sido reseteada"
        mensaje = f"""
        Hola {usuario.usuario},
        
        Tu contraseña ha sido reseteada por un administrador.
        
        Contraseña temporal: {contrasena_temporal}
        
        Para establecer una nueva contraseña, haz clic en:
        {enlace}
        
        Este enlace expira en 1 hora.
        """
        
        try:
            send_mail(
                asunto,
                mensaje,
                settings.DEFAULT_FROM_EMAIL,
                [usuario.correo],
                fail_silently=False
            )
        except Exception as exc:
            logger.exception('Error al enviar email de reseteo a %s: %s', usuario.correo, exc)
    
    def _registrar_auditoria(self, admin, usuario_afectado, accion, 
                            datos_anteriores=None, datos_nuevos=None, ip_admin=None):
        """Registrar acción en log de auditoría (RN-021, RN-026)"""
        Log_Auditoria.objects.create(
            usuario_admin=admin,
            usuario_afectado=usuario_afectado,
            accion=accion,
            datos_anteriores=datos_anteriores,
            datos_nuevos=datos_nuevos,
            ip_admin=ip_admin
        )
    
    def _obtener_ip_cliente(self, request):
        """Obtener IP del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
