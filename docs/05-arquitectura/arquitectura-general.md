# Arquitectura General

## 16.1 Patron Arquitectonico

El sistema RED implementa una **Arquitectura de Microservicios Hibrida** complementada con el patron **MVC (Model-View-ViewSet)** en el backend y **Componentes (SPA)** en el frontend.

### Diagrama de Capas

```mermaid
graph TB
    subgraph "Capa de Presentacion (Frontend - React)"
        CP1[Componentes UI]
        CP2[Paginas / Vistas]
        CP3[Context API / Estado Global]
        CP4[Servicios HTTP / Axios]
    end
    
    subgraph "Capa de API (Backend - Django REST)"
        API1[URLs / Routers]
        API2[Views / Viewsets]
        API3[Serializers]
        API4[Permisos / Autenticacion]
    end
    
    subgraph "Capa de Negocio (Backend - Django)"
        BN1[Models / ORM]
        BN2[Validaciones / Reglas de Negocio]
        BN3[Senales / Eventos]
        BN4[Servicios Externos<br/>Cloudinary / Email]
    end
    
    subgraph "Capa de Datos"
        CD1[(SQLite/PostgreSQL)]
        CD2[Archivos Multimedia]
        CD3[Cloudinary Storage]
    end
    
    CP1 --> CP2
    CP2 --> CP3
    CP3 --> CP4
    CP4 -->|HTTP/JSON| API1
    API1 --> API2
    API2 --> API3
    API2 --> API4
    API3 --> BN1
    BN1 --> BN2
    BN2 --> BN3
    BN3 --> BN4
    BN1 --> CD1
    BN4 --> CD2
    BN4 --> CD3
```

## 16.2 Patrones de Diseno Implementados

| Patron | Implementacion | Ubicacion |
|--------|---------------|-----------|
| **MVC (Modelo-Vista-Controlador)** | Django Models (M), DRF Views/Viewsets (C), Serializers (V) | Todo el backend |
| **Repository** | Querysets de Django ORM | Models, Viewsets |
| **Singleton** | Context API de React (ThemeContext, CartContext) | Frontend |
| **Proxy** | Proxy de Vite para /api/ y /media/ | `vite.config.js` |
| **Observer** | Django Signals (validaciones en models.clean/save) | Models |
| **Strategy** | Permisos por ViewSet (AllowAny, IsAuthenticated, AdminPermission) | Viewsets |
| **Chain of Responsibility** | Middleware de Django (CORS, Session, Auth, CSRF) | `settings.py` |
| **DTO (Data Transfer Object)** | DRF Serializers | `serializers.py` de cada app |
| **Template Method** | ViewSets de DRF con metodos create/update/list/retrieve | Viewsets |
| **Factory** | `get_serializer_class()` en ViewSets | Viewsets |

## 16.3 Flujo de una Peticion Tipica

```mermaid
sequenceDiagram
    participant Browser as Navegador
    participant Vite as Vite Proxy
    participant Nginx as Gunicorn
    participant Middleware as Django Middleware
    participant URL as URL Router
    participant View as ViewSet
    participant Serializer as Serializer
    participant Model as Model/ORM
    participant DB as Base de Datos
    
    Browser->>Vite: GET /api/productos/ (HTTP)
    Vite->>Nginx: Proxy reverso a :8000
    
    Nginx->>Middleware: Pasa a Django WSGI
    Middleware->>Middleware: CorsMiddleware
    Middleware->>Middleware: SessionMiddleware
    Middleware->>Middleware: AuthenticationMiddleware
    
    Middleware->>URL: Resuelve URL
    URL->>View: Ejecuta ViewSet.list()
    
    View->>Serializer: get_serializer_class()
    View->>Model: get_queryset()
    Model->>DB: SELECT con filtros
    DB-->>Model: Resultados
    
    Model->>Serializer: Serializa datos
    Serializer-->>View: Data serializada
    
    View-->>URL: Response JSON
    URL-->>Middleware: HTTP Response
    Middleware-->>Nginx: Respuesta con headers CORS
    
    Nginx-->>Vite: JSON Response
    Vite-->>Browser: JSON Response
```

## 16.4 Estructura de una App Django

Cada aplicacion dentro del backend sigue una estructura modular consistente:

```
apps/<nombre_app>/
├── __init__.py
├── models.py           # Definicion de modelos (entidades de BD)
├── views.py            # Vistas tradicionales (no usadas mayormente)
├── admin.py            # Configuracion del admin de Django
├── apps.py             # Configuracion de la aplicacion
├── tests.py            # Pruebas unitarias
├── migrations/         # Migraciones de base de datos
│   ├── __init__.py
│   └── 0001_initial.py
└── api/                # Capa de API REST
    ├── __init__.py
    ├── serializers.py  # Serializers (DTO)
    ├── viewset.py      # Viewsets (Controladores)
    └── urls.py         # Rutas de la API
```

## 16.5 Decisiones Arquitectonicas Clave

| Decision | Alternativa | Justificacion |
|----------|------------|---------------|
| **Django en vez de FastAPI** | FastAPI, Flask | Django ofrece ORM maduro, admin integrado, migraciones, ecosistema completo para proyectos formativos |
| **DRF en vez de GraphQL** | GraphQL (Graphene) | REST es mas simple de documentar, estandar en proyectos formativos SENA, suficiente para el alcance |
| **React en vez de Next.js** | Next.js, Vue, Angular | SPA pura es suficiente (sin SSR requerido), React tiene mayor demanda laboral |
| **JWT + Sesion** | Solo JWT | El carrito necesita sesion para usuarios anonimos; JWT para autenticacion de API |
| **SQLite en desarrollo** | PostgreSQL desde inicio | SQLite no requiere instalacion de servidor, agiliza el setup inicial; migracion a PG es directa con Django ORM |
| **Microservicio 3D separado** | Integrado en frontend | El editor 3D tiene requisitos tecnicos especificos (Three.js, Tailwind) que justifican su aislamiento |
