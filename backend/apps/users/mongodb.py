import logging
from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

_client = None
_db = None
_connected = False


def is_mongo_connected():
    """Return whether the MongoDB client is currently connected."""
    return _connected


def get_mongo_client():
    """Get or create the singleton MongoClient, pinging the server to verify connectivity."""
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


def get_mongo_db():
    """Get the MongoDB database instance (lazy-init via get_mongo_client)."""
    global _db
    if _db is None and get_mongo_client() is not None:
        _db = _client[settings.MONGODB_NAME]
    return _db


def close_mongo_connection():
    """Close the MongoDB connection and reset global state."""
    global _client, _db, _connected
    if _client is not None:
        _client.close()
    _client = None
    _db = None
    _connected = False
    logger.info('Conexión MongoDB cerrada')
