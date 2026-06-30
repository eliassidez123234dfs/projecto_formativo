import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..mongo_service import (
    add_comment,
    create_design,
    create_template,
    delete_design,
    get_cart,
    get_design,
    get_template,
    like_design,
    like_template,
    list_templates,
    list_user_designs,
    log_event,
    merge_carts,
    publish_design,
    query_logs,
    update_design,
    upsert_cart,
)

from .mongo_serializers import (
    AuditLogSerializer,
    CartSessionSerializer,
    CommunityTemplateSerializer,
    SavedDesignSerializer,
)

from .auth_backend import UsuarioJWTAuthentication
from .admin_viewset import AdminPermission

logger = logging.getLogger(__name__)


class SavedDesignViewSet(viewsets.ViewSet):
    """ViewSet for CRUD on user's saved 3D designs (MongoDB-backed)."""
    authentication_classes = [UsuarioJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List paginated designs for the authenticated user."""
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        designs, total = list_user_designs(request.user.id, page, page_size)
        return Response({
            'results': designs,
            'total': total,
            'page': page,
            'page_size': page_size,
        })

    def create(self, request):
        """Save a new 3D design configuration."""
        serializer = SavedDesignSerializer(data={
            **request.data,
            'user_id': request.user.id,
        })
        serializer.is_valid(raise_exception=True)
        design = create_design(serializer.validated_data)
        if design is None:
            return Response(
                {'error': 'MongoDB no disponible'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        log_event(
            'design.created',
            actor_id=request.user.id,
            target_type='saved_design',
            target_id=design['id'],
            metadata={'name': design['name']},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(design, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        """Get a single saved design by ID (owner-only)."""
        design = get_design(pk)
        if not design:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if design['user_id'] != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        return Response(design)

    def update(self, request, pk=None):
        """Update an existing saved design (owner-only)."""
        design = get_design(pk)
        if not design:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if design['user_id'] != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = SavedDesignSerializer(data={
            **request.data,
            'user_id': request.user.id,
        })
        serializer.is_valid(raise_exception=True)
        updated = update_design(pk, serializer.validated_data)
        return Response(updated)

    def destroy(self, request, pk=None):
        """Delete a saved design (owner-only)."""
        design = get_design(pk)
        if not design:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if design['user_id'] != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        delete_design(pk)
        log_event(
            'design.deleted',
            actor_id=request.user.id,
            target_type='saved_design',
            target_id=pk,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a design to make it visible to the community."""
        design = get_design(pk)
        if not design:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if design['user_id'] != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        updated = publish_design(pk)
        log_event(
            'design.published',
            actor_id=request.user.id,
            target_type='saved_design',
            target_id=pk,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(updated)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Toggle like on a saved design."""
        updated = like_design(pk, request.user.id)
        if not updated:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(updated)

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        """Add a comment to a saved design."""
        text = request.data.get('text', '').strip()
        if not text:
            return Response(
                {'error': 'El comentario no puede estar vacío'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = add_comment(
            pk, request.user.id,
            getattr(request.user, 'usuario', 'Usuario'),
            text,
        )
        if not updated:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(updated)


class AuditLogViewSet(viewsets.ViewSet):
    """ViewSet for querying audit logs stored in MongoDB (admin only)."""
    authentication_classes = [UsuarioJWTAuthentication]
    permission_classes = [AdminPermission]

    def list(self, request):
        """List paginated audit logs with optional filters."""
        filters = {}
        for field in ('action', 'actor_id', 'target_type', 'target_id', 'severity'):
            val = request.query_params.get(field)
            if val:
                filters[field] = int(val) if field in ('actor_id',) else val
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        logs, total = query_logs(filters, page, page_size)
        return Response({
            'results': logs,
            'total': total,
            'page': page,
            'page_size': page_size,
        })

    def create(self, request):
        """Create a custom audit log entry manually."""
        serializer = AuditLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log_id = log_event(**serializer.validated_data,
                           ip_address=request.META.get('REMOTE_ADDR'))
        if log_id is None:
            return Response(
                {'error': 'MongoDB no disponible'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({'_id': log_id}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get aggregated event counts grouped by action type."""
        days = int(request.query_params.get('days', 7))
        stats = log_event.__wrapped__ if hasattr(log_event, '__wrapped__') else None
        from ..mongo_service import get_event_stats
        data = get_event_stats(days)
        return Response({'days': days, 'events': data})


class CartSessionViewSet(viewsets.ViewSet):
    """ViewSet for managing cart sessions in MongoDB (anonymous and authenticated)."""
    authentication_classes = [UsuarioJWTAuthentication]
    permission_classes = [AllowAny]

    def list(self, request):
        """Get current cart contents for the user/session."""
        user_id = request.user.id if request.user.is_authenticated else None
        session_key = request.session.session_key
        cart = get_cart(user_id=user_id, session_key=session_key)
        if cart:
            return Response(cart)
        return Response({'items': []})

    @action(detail=False, methods=['post'])
    def save(self, request):
        """Upsert cart items into MongoDB."""
        user_id = request.user.id if request.user.is_authenticated else None
        session_key = request.session.session_key
        if not session_key and not request.user.is_authenticated:
            request.session.save()
            session_key = request.session.session_key

        items_data = request.data.get('items', [])
        result = upsert_cart(
            user_id=user_id,
            session_key=session_key,
            items=items_data,
        )
        if result is None:
            return Response(
                {'error': 'MongoDB no disponible'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(result)

    @action(detail=False, methods=['post'])
    def merge(self, request):
        """Merge session cart into user cart after login."""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Debes iniciar sesión'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        session_key = request.session.session_key
        if session_key:
            result = merge_carts(request.user.id, session_key)
        else:
            result = get_cart(user_id=request.user.id)
        return Response(result or {'items': []})


class CommunityTemplateViewSet(viewsets.ViewSet):
    """ViewSet for browsing and contributing community-shared design templates."""
    authentication_classes = [UsuarioJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List paginated community templates with optional tag/sort filters."""
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        tag = request.query_params.get('tag')
        sort = request.query_params.get('sort', 'popular')
        templates, total = list_templates(page, page_size, tag, sort)
        return Response({
            'results': templates,
            'total': total,
            'page': page,
            'page_size': page_size,
        })

    def create(self, request):
        """Submit a new community template."""
        serializer = CommunityTemplateSerializer(data={
            **request.data,
            'designer_id': request.user.id,
            'designer_name': getattr(request.user, 'usuario', 'Usuario'),
        })
        serializer.is_valid(raise_exception=True)
        template = create_template(serializer.validated_data)
        if template is None:
            return Response(
                {'error': 'MongoDB no disponible'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        log_event(
            'template.created',
            actor_id=request.user.id,
            target_type='community_template',
            target_id=template['id'],
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(template, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        """Get a single community template (increments view count)."""
        template = get_template(pk)
        if not template:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(template)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Toggle like on a community template."""
        updated = like_template(pk, request.user.id)
        if not updated:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(updated)
