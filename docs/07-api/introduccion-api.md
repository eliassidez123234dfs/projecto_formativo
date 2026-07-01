# Documentacion de la API REST

## 21.1 Descripcion General

La API de RED es una **API REST** construida con **Django REST Framework (DRF) 3.16**. Proporciona endpoints para la gestion completa del sistema: autenticacion, usuarios, productos, catalogo, carrito, checkout, ordenes, modelos 3D y contacto.

## 21.2 Base URL

**Desarrollo local:**
```
http://localhost:8000/api/
```

**Produccion:**
```
https://redestampacion.com/api/
```

## 21.3 Formato de Datos

Todas las peticiones y respuestas utilizan **JSON** como formato de intercambio.

**Headers requeridos:**
```
Content-Type: application/json
Accept: application/json
```

## 21.4 Autenticacion

La API soporta dos mecanismos de autenticacion:

| Mecanismo | Donde se usa | Como se envia |
|-----------|-------------|---------------|
| **JWT (JSON Web Token)** | Endpoints protegidos de usuario y admin | Header: `Authorization: Bearer <access_token>` |
| **Session (Cookie)** | Endpoints de carrito de compras | Cookie: `sessionid=<session_key>` (withCredentials) |

### Flujo de Autenticacion JWT

1. El cliente envia credenciales a `POST /api/login/login/`
2. El servidor valida y responde con `access_token` (15 min) y `refresh_token` (7 dias)
3. El cliente almacena los tokens y los envia en el header `Authorization` para peticiones posteriores
4. Cuando el `access_token` expira, el cliente usa `refresh_token` en `POST /api/token/refresh/` para obtener uno nuevo
5. Si el `refresh_token` falla, el cliente redirige al login

### Interceptor de Axios (Frontend)

El frontend implementa un interceptor que:
- Adjunta automaticamente el `access_token` a las peticiones autenticadas
- Detecta errores 401 y refresca el token automaticamente
- Cola las peticiones fallidas durante el refresco
- Redirige al login si el refresh falla

## 21.5 Codigos de Estado HTTP

| Codigo | Significado | Uso |
|--------|-------------|-----|
| 200 | OK | Peticion exitosa |
| 201 | Created | Recurso creado exitosamente |
| 204 | No Content | Recurso eliminado exitosamente |
| 400 | Bad Request | Datos de entrada invalidos |
| 401 | Unauthorized | Credenciales incorrectas o no proporcionadas |
| 403 | Forbidden | No tiene permisos para el recurso |
| 404 | Not Found | Recurso no encontrado |
| 429 | Too Many Requests | Excedio el limite de peticiones (rate limit) |
| 500 | Internal Server Error | Error interno del servidor |

## 21.6 Paginacion

Los endpoints de listado utilizan paginacion **PageNumberPagination**:

| Parametro | Tipo | Defecto | Maximo | Descripcion |
|-----------|------|---------|--------|-------------|
| `page` | int | 1 | - | Numero de pagina |
| `page_size` | int | 20 | 100 | Elementos por pagina |

**Respuesta paginada:**
```json
{
    "count": 150,
    "next": "http://localhost:8000/api/products/?page=3",
    "previous": "http://localhost:8000/api/products/?page=1",
    "results": [...]
}
```

## 21.7 Manejo de Errores

**Errores de validacion (400):**
```json
{
    "campo": ["Mensaje de error 1", "Mensaje de error 2"]
}
```

**Errores de autenticacion (401):**
```json
{
    "error": "Credenciales invalidas."
}
```

**Errores internos (500):**
```json
{
    "error": "Error interno del servidor. Intenta nuevamente."
}
```

## 21.8 Rate Limiting

| Endpoint | Limite | Periodo |
|----------|--------|---------|
| Todos los endpoints (anonimo) | 1000 peticiones | 1 hora |
| Todos los endpoints (autenticado) | 10000 peticiones | 1 hora |
| Formulario de contacto | 3 peticiones | 1 hora |
