# ==============================================================================
# Conexión a MongoDB — Red Estampación
# ==============================================================================
# Gestiona la conexión a MongoDB utilizando el patrón Singleton.
# El cliente (MongoClient) se crea una única vez y se reutiliza durante
# todo el ciclo de vida de la aplicación.
#
# Funciones:
#   is_mongo_connected() → verifica si el cliente está conectado.
#   get_mongo_client()   → obtiene o crea el MongoClient singleton.
#   get_mongo_db()       → obtiene la instancia de la base de datos.
#   close_mongo_connection() → cierra la conexión y reinicia el estado global.
#
# Patrón: Singleton (una única instancia de MongoClient para toda la app).
# Lazy initialization: el cliente se crea en el primer llamado a
# get_mongo_client(), no al importar el módulo.
# Timeout: serverSelectionTimeoutMS=5000 para no bloquear si MongoDB
# no está disponible (falla rápido).
# ==============================================================================
import logging
from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

# ── Variables de estado global (Singleton) ──
# _client:    MongoClient compartido (None si no conectado).
# _db:        instancia de la base de datos (cached).
# _connected: flag de estado de conexión.
_client = None
_db = None
_connected = False


# ─────────────────────────────────────────────────────────────────────────────
# is_mongo_connected
# ─────────────────────────────────────────────────────────────────────────────
# Retorna True si el cliente MongoDB está actualmente conectado y operativo.
# El flag _connected se actualiza en get_mongo_client() tras un ping exitoso.
# ─────────────────────────────────────────────────────────────────────────────
def is_mongo_connected():
    """Retorna True si el cliente MongoDB está conectado y operativo."""
    return _connected


# ─────────────────────────────────────────────────────────────────────────────
# get_mongo_client (Singleton + Lazy Initialization)
# ─────────────────────────────────────────────────────────────────────────────
# Obtiene o crea el MongoClient singleton.
#
# Flujo:
#   1. Si _client ya existe, lo retorna directamente.
#   2. Si no existe:
#       a. Lee MONGODB_URI de settings (desde variables de entorno).
#       b. Si la URI está vacía, logea advertencia y retorna None.
#       c. Crea MongoClient con timeout de 5 segundos.
#       d. Ejecuta ping al servidor para verificar conectividad.
#       e. Si el ping falla, logea error, reinicia estado y retorna None.
#
# Timeouts: serverSelectionTimeoutMS=5000, connectTimeoutMS=5000.
# Esto asegura que la app no se bloquee indefinidamente si MongoDB
# no está disponible (fail-fast).
# ─────────────────────────────────────────────────────────────────────────────
def get_mongo_client():
    """Obtiene o crea el MongoClient singleton con lazy initialization. Verifica conectividad con ping."""
    global _client, _connected
    if _client is None:
        uri = settings.MONGODB_URI
        if not uri:
            logger.warning('MONGODB_URI no configurada')
            return None
        try:
            _client = MongoClient(
                uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            _client.admin.command('ping')
            _connected = True
            logger.info('Conexión a MongoDB establecida')
        except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
            logger.error('Error conectando a MongoDB: %s', exc)
            _client = None
            _connected = False
    return _client


# ─────────────────────────────────────────────────────────────────────────────
# get_mongo_db (Lazy initialization)
# ─────────────────────────────────────────────────────────────────────────────
# Obtiene la instancia de la base de datos MongoDB (definida en
# settings.MONGODB_NAME). Inicializa perezosamente el cliente si es
# necesario (vía get_mongo_client()).
#
# Retorna None si MongoDB no está disponible.
# ─────────────────────────────────────────────────────────────────────────────
def get_mongo_db():
    """Obtiene la instancia de la base de datos MongoDB (inicialización perezosa vía get_mongo_client)."""
    global _db
    if _db is None and get_mongo_client() is not None:
        _db = _client[settings.MONGODB_NAME]
    return _db


# ─────────────────────────────────────────────────────────────────────────────
# close_mongo_connection
# ─────────────────────────────────────────────────────────────────────────────
# Cierra la conexión del MongoClient y reinicia todas las variables de
# estado global (_client, _db, _connected) a None/False.
# Útil para tests, recarga en caliente o limpieza controlada.
# ─────────────────────────────────────────────────────────────────────────────
def close_mongo_connection():
    """Cierra la conexión MongoDB y reinicia el estado global (Singleton)."""
    global _client, _db, _connected
    if _client is not None:
        _client.close()
    _client = None
    _db = None
    _connected = False
    logger.info('Conexión MongoDB cerrada')
