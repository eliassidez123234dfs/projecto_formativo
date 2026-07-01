# ==============================================================================
# Servicio MongoDB — Red Estampación
# ==============================================================================
# Capa de acceso a MongoDB (Repository Pattern) para datos no relacionales.
# Proporciona funciones CRUD para las colecciones:
#
#   saved_designs        → Planos de configuración de diseño 3D guardados por
#                          cada usuario (con soporte de likes, comentarios,
#                          publicación a la comunidad).
#   audit_logs           → Bitácora de eventos de auditoría (complementa el
#                          Log_Auditoria en SQL para consultas agregadas).
#   cart_sessions        → Carritos de compra persistentes multi-dispositivo
#                          (anónimos y autenticados, con merge post-login).
#   community_templates  → Catálogo de plantillas de diseño compartidas por
#                          la comunidad (con likes, vistas, descargas).
#
# Patrón: Repository. Cada función encapsula operaciones atómicas contra
# MongoDB, manejando la disponibilidad de la conexión (retorna None si
# MongoDB no está conectado).
# ==============================================================================
import logging
from datetime import datetime, timezone

from bson import ObjectId
from django.conf import settings
from pymongo import DESCENDING, ASCENDING, IndexModel

from .mongodb import get_mongo_db, is_mongo_connected

logger = logging.getLogger(__name__)

# ===========================================================================
# Índices de MongoDB
# ===========================================================================
# Definición centralizada de índices para todas las colecciones.
# Se crean al iniciar el sistema vía ensure_indexes().
# Cada colección tiene índices optimizados para sus consultas más frecuentes:
#   - saved_designs:    user_id, is_published+created_at, tags, product_id.
#   - audit_logs:      actor_id+created_at, target_type+target_id, action.
#   - cart_sessions:   user_id (único+sparse), session_key (único+sparse).
#   - community_templates: likes_count, tags, designer_id, is_featured+created_at.
# ===========================================================================

COLLECTION_INDEXES = {
    'saved_designs': [
        IndexModel([('user_id', ASCENDING)]),
        IndexModel([('is_published', ASCENDING), ('created_at', DESCENDING)]),
        IndexModel([('tags', ASCENDING)]),
        IndexModel([('product_id', ASCENDING)]),
    ],
    'audit_logs': [
        IndexModel([('actor_id', ASCENDING), ('created_at', DESCENDING)]),
        IndexModel([('target_type', ASCENDING), ('target_id', ASCENDING)]),
        IndexModel([('action', ASCENDING)]),
        IndexModel([('created_at', DESCENDING)]),
    ],
    'cart_sessions': [
        IndexModel([('user_id', ASCENDING)], unique=True, sparse=True),
        IndexModel([('session_key', ASCENDING)], unique=True, sparse=True),
        IndexModel([('updated_at', ASCENDING)]),
    ],
    'community_templates': [
        IndexModel([('likes_count', DESCENDING)]),
        IndexModel([('tags', ASCENDING)]),
        IndexModel([('designer_id', ASCENDING)]),
        IndexModel([('is_featured', ASCENDING), ('created_at', DESCENDING)]),
    ],
}


def ensure_indexes():
    """Create MongoDB indexes if they don't exist for all collections."""
    db = get_mongo_db()
    if db is None:
        logger.warning('MongoDB no disponible — omitiendo creación de índices')
        return
    for coll_name, indexes in COLLECTION_INDEXES.items():
        try:
            existing = db[coll_name].index_information()
            existing_names = {v.get('name') for v in existing.values()}
            for idx in indexes:
                if idx.document.get('name') not in existing_names:
                    db[coll_name].create_indexes([idx])
            logger.info('Índices verificados para %s', coll_name)
        except Exception as exc:
            logger.error('Error creando índices para %s: %s', coll_name, exc)


# ===========================================================================
# Funciones auxiliares (helpers)
# ===========================================================================
# _now():      retorna el timestamp UTC actual.
# _serialize(): convierte _id (ObjectId) a id (string) para JSON.
# _serialize_many(): aplica _serialize a un cursor de documentos.

def _now():
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


def _serialize(doc):
    """Convert MongoDB _id to string id for JSON serialization."""
    if doc is None:
        return None
    doc['id'] = str(doc.pop('_id'))
    return doc


def _serialize_many(cursor):
    """Serialize a cursor of MongoDB documents."""
    return [_serialize(doc) for doc in cursor]


# ===========================================================================
# COLECCIÓN: saved_designs (Diseños guardados — configuración 3D)
# ===========================================================================
# Almacena el JSON completo de configuración de diseños 3D creados por
# los usuarios. Cada diseño puede ser publicado a la comunidad y recibir
# likes y comentarios.
#
# Funciones:
#   create_design()     → inserta un nuevo diseño.
#   get_design()        → obtiene un diseño por ObjectId.
#   update_design()     → actualiza campos de un diseño.
#   delete_design()     → elimina un diseño por ObjectId.
#   list_user_designs() → lista paginada de diseños de un usuario.
#   publish_design()    → marca un diseño como público.
#   like_design()       → toggle de like por usuario.
#   add_comment()       → agrega un comentario al diseño.
# ===========================================================================

def create_design(data):
    """Guarda el JSON completo de configuración de un diseño 3D."""
    db = get_mongo_db()
    if db is None:
        return None
    doc = {
        **data,
        'likes_count': 0,
        'view_count': 0,
        'comments': [],
        'is_published': False,
        'is_template': False,
        'created_at': _now(),
        'updated_at': _now(),
    }
    result = db.saved_designs.insert_one(doc)
    return _serialize(db.saved_designs.find_one({'_id': result.inserted_id}))


def get_design(design_id):
    """Fetch a single saved design by its MongoDB ObjectId."""
    db = get_mongo_db()
    if db is None:
        return None
    doc = db.saved_designs.find_one({'_id': ObjectId(design_id)})
    return _serialize(doc)


def update_design(design_id, data):
    """Update a saved design's configuration data."""
    db = get_mongo_db()
    if db is None:
        return None
    data['updated_at'] = _now()
    db.saved_designs.update_one(
        {'_id': ObjectId(design_id)},
        {'$set': data},
    )
    return get_design(design_id)


def delete_design(design_id):
    """Delete a saved design document by ID."""
    db = get_mongo_db()
    if db is None:
        return False
    result = db.saved_designs.delete_one({'_id': ObjectId(design_id)})
    return result.deleted_count > 0


def list_user_designs(user_id, page=1, page_size=20):
    """List paginated saved designs for a given user."""
    db = get_mongo_db()
    if db is None:
        return [], 0
    skip = (page - 1) * page_size
    cursor = db.saved_designs.find({'user_id': user_id})\
        .sort('updated_at', DESCENDING)\
        .skip(skip).limit(page_size)
    total = db.saved_designs.count_documents({'user_id': user_id})
    return _serialize_many(cursor), total


def publish_design(design_id):
    """Mark a saved design as published (community-visible)."""
    return update_design(design_id, {'is_published': True})


def like_design(design_id, user_id):
    """Toggle like status on a saved design for a user."""
    db = get_mongo_db()
    if db is None:
        return None
    field = f'liked_by.{user_id}'
    existing = db.saved_designs.find_one(
        {'_id': ObjectId(design_id), field: {'$exists': True}},
    )
    if existing:
        db.saved_designs.update_one(
            {'_id': ObjectId(design_id)},
            {'$unset': {field: ''}, '$inc': {'likes_count': -1}},
        )
    else:
        db.saved_designs.update_one(
            {'_id': ObjectId(design_id)},
            {'$set': {field: _now().isoformat()}, '$inc': {'likes_count': 1}},
        )
    return get_design(design_id)


def add_comment(design_id, user_id, username, text):
    """Append a comment to a saved design's comment list."""
    db = get_mongo_db()
    if db is None:
        return None
    comment = {
        'comment_id': str(ObjectId()),
        'user_id': user_id,
        'username': username,
        'text': text,
        'created_at': _now().isoformat(),
    }
    db.saved_designs.update_one(
        {'_id': ObjectId(design_id)},
        {'$push': {'comments': comment}},
    )
    return get_design(design_id)


# ===========================================================================
# COLECCIÓN: audit_logs (Bitácora de auditoría)
# ===========================================================================
# Almacena eventos de auditoría como complemento a Log_Auditoria (SQL).
# MongoDB permite consultas agregadas (group by action, stats, etc.) que
# serían costosas en SQL.
#
# Funciones:
#   log_event()       → registra un evento de auditoría.
#   query_logs()      → consulta paginada con filtros opcionales.
#   get_event_stats() → conteo agregado de eventos por acción (N días).
# ===========================================================================

def log_event(action, actor_id=None, target_type=None, target_id=None,
              metadata=None, ip_address=None, severity='info'):
    """Registra un evento de auditoría en MongoDB (complementario a Log_Auditoria en SQL)."""
    db = get_mongo_db()
    if db is None:
        return None
    doc = {
        'action': action,
        'actor_id': actor_id,
        'target_type': target_type,
        'target_id': target_id,
        'metadata': metadata or {},
        'ip_address': ip_address,
        'severity': severity,
        'created_at': _now(),
    }
    result = db.audit_logs.insert_one(doc)
    return str(result.inserted_id)


def query_logs(filters=None, page=1, page_size=50, sort_by='created_at',
               sort_dir=DESCENDING):
    """Query paginated audit log entries with optional filters."""
    db = get_mongo_db()
    if db is None:
        return [], 0
    query = filters or {}
    skip = (page - 1) * page_size
    cursor = db.audit_logs.find(query)\
        .sort(sort_by, sort_dir)\
        .skip(skip).limit(page_size)
    total = db.audit_logs.count_documents(query)
    return _serialize_many(cursor), total


def get_event_stats(days=7):
    """Agrega conteo de eventos por acción en los últimos N días."""
    db = get_mongo_db()
    if db is None:
        return []
    since = _now()
    since = since.replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    since -= timedelta(days=days)

    pipeline = [
        {'$match': {'created_at': {'$gte': since}}},
        {'$group': {
            '_id': '$action',
            'count': {'$sum': 1},
            'last_event': {'$max': '$created_at'},
        }},
        {'$sort': {'count': -1}},
    ]
    return list(db.audit_logs.aggregate(pipeline))


# ===========================================================================
# COLECCIÓN: cart_sessions (Carritos de compra)
# ===========================================================================
# Almacena carritos de compra persistentes tanto para usuarios anónimos
# (identificados por session_key) como autenticados (identificados por
# user_id). Soporta fusión (merge) del carrito anónimo al autenticado
# después del login.
#
# Funciones:
#   upsert_cart()          → crea o actualiza un carrito.
#   get_cart()             → obtiene carrito por user_id o session_key.
#   merge_carts()          → fusiona carrito anónimo → autenticado post-login.
#   list_abandoned_carts() → carritos sin actividad por N horas.
# ===========================================================================

def upsert_cart(user_id=None, session_key=None, items=None):
    """Create or update a cart session (by user_id or session_key)."""
    db = get_mongo_db()
    if db is None:
        return None
    if not user_id and not session_key:
        return None

    doc = {
        'user_id': user_id,
        'session_key': session_key,
        'items': items or [],
        'updated_at': _now(),
    }

    if user_id:
        existing = db.cart_sessions.find_one({'user_id': user_id})
        if existing:
            db.cart_sessions.update_one(
                {'user_id': user_id},
                {'$set': {'items': doc['items'], 'updated_at': doc['updated_at']}},
            )
            return _serialize(db.cart_sessions.find_one({'user_id': user_id}))
        else:
            doc['created_at'] = _now()
            result = db.cart_sessions.insert_one(doc)
            return _serialize(db.cart_sessions.find_one({'_id': result.inserted_id}))

    existing = db.cart_sessions.find_one({'session_key': session_key})
    if existing:
        db.cart_sessions.update_one(
            {'session_key': session_key},
            {'$set': {'items': doc['items'], 'updated_at': doc['updated_at']}},
        )
        return _serialize(db.cart_sessions.find_one({'session_key': session_key}))
    else:
        doc['created_at'] = _now()
        result = db.cart_sessions.insert_one(doc)
        return _serialize(db.cart_sessions.find_one({'_id': result.inserted_id}))


def get_cart(user_id=None, session_key=None):
    """Fetch a cart session by user_id or anonymous session_key."""
    db = get_mongo_db()
    if db is None:
        return None
    if user_id:
        return _serialize(db.cart_sessions.find_one({'user_id': user_id}))
    if session_key:
        return _serialize(db.cart_sessions.find_one({'session_key': session_key}))
    return None


def merge_carts(user_id, session_key):
    """Merge session cart into user cart after login."""
    db = get_mongo_db()
    if db is None:
        return None
    session_cart = db.cart_sessions.find_one({'session_key': session_key})
    user_cart = db.cart_sessions.find_one({'user_id': user_id})

    if not session_cart:
        return get_cart(user_id=user_id)

    session_items = {f"{i['product_id']}-{i.get('variant_id')}": i
                     for i in session_cart.get('items', [])}

    if user_cart:
        user_items = {f"{i['product_id']}-{i.get('variant_id')}": i
                      for i in user_cart.get('items', [])}
        for key, item in session_items.items():
            if key in user_items:
                user_items[key]['quantity'] = max(
                    user_items[key]['quantity'], item['quantity'],
                )
            else:
                user_items[key] = item
        merged = list(user_items.values())
        db.cart_sessions.update_one(
            {'user_id': user_id},
            {'$set': {'items': merged, 'updated_at': _now()}},
        )
    else:
        db.cart_sessions.update_one(
            {'session_key': session_key},
            {'$set': {'user_id': user_id}},
        )
    db.cart_sessions.delete_one({'session_key': session_key, 'user_id': None})
    return get_cart(user_id=user_id)


def list_abandoned_carts(hours=24):
    """Carritos sin actividad por más de N horas (para campañas de recuperación)."""
    db = get_mongo_db()
    if db is None:
        return []
    from datetime import timedelta
    cutoff = _now() - timedelta(hours=hours)
    cursor = db.cart_sessions.find({
        'user_id': {'$ne': None},
        'updated_at': {'$lt': cutoff},
        'items': {'$not': {'$size': 0}},
    }).sort('updated_at', ASCENDING)
    return _serialize_many(cursor)


# ===========================================================================
# COLECCIÓN: community_templates (Plantillas de la comunidad)
# ===========================================================================
# Catálogo de diseños 3D compartidos por los usuarios. Las plantillas
# pueden recibir likes, incrementar su contador de vistas y descargas,
# y ser marcadas como destacadas (is_featured) por los administradores.
#
# Funciones:
#   create_template()  → crea una nueva plantilla comunitaria.
#   list_templates()   → lista paginada con filtro por tag y orden.
#   get_template()     → obtiene una plantilla (incrementa view_count).
#   like_template()    → toggle de like por usuario.
# ===========================================================================

def create_template(data):
    """Create a new community template document."""
    db = get_mongo_db()
    if db is None:
        return None
    doc = {
        **data,
        'likes_count': 0,
        'view_count': 0,
        'download_count': 0,
        'comments': [],
        'is_featured': False,
        'created_at': _now(),
        'updated_at': _now(),
    }
    result = db.community_templates.insert_one(doc)
    return _serialize(db.community_templates.find_one({'_id': result.inserted_id}))


def list_templates(page=1, page_size=20, tag=None, sort='popular'):
    """List paginated community templates, optionally filtered by tag or sorted."""
    db = get_mongo_db()
    if db is None:
        return [], 0
    query = {}
    if tag:
        query['tags'] = tag

    sort_field = 'likes_count' if sort == 'popular' else 'created_at'
    sort_dir = DESCENDING
    skip = (page - 1) * page_size

    cursor = db.community_templates.find(query)\
        .sort(sort_field, sort_dir)\
        .skip(skip).limit(page_size)
    total = db.community_templates.count_documents(query)
    return _serialize_many(cursor), total


def get_template(template_id):
    """Fetch a single community template and increment its view count."""
    db = get_mongo_db()
    if db is None:
        return None
    doc = db.community_templates.find_one({'_id': ObjectId(template_id)})
    if doc:
        db.community_templates.update_one(
            {'_id': ObjectId(template_id)},
            {'$inc': {'view_count': 1}},
        )
    return _serialize(doc)


def like_template(template_id, user_id):
    """Toggle like status on a community template for a user."""
    db = get_mongo_db()
    if db is None:
        return None
    field = f'liked_by.{user_id}'
    existing = db.community_templates.find_one(
        {'_id': ObjectId(template_id), field: {'$exists': True}},
    )
    if existing:
        db.community_templates.update_one(
            {'_id': ObjectId(template_id)},
            {'$unset': {field: ''}, '$inc': {'likes_count': -1}},
        )
    else:
        db.community_templates.update_one(
            {'_id': ObjectId(template_id)},
            {'$set': {field: _now().isoformat()}, '$inc': {'likes_count': 1}},
        )
    return get_template(template_id)
