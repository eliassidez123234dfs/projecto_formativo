# Diagrama de Componentes

## 13.1 Diagrama de Componentes del Sistema

```mermaid
graph TB
    subgraph "Cliente"
        Browser[Navegador Web]
    end
    
    subgraph "Frontend (React + Vite)"
        direction TB
        Router[React Router DOM]
        Context[Context API<br/>ThemeContext / CartContext]
        Pages[Paginas<br/>22 componentes de pagina]
        Components[Componentes UI<br/>15 componentes reutilizables]
        Services[Servicios API<br/>Axios con interceptors]
        Styles[Sistema de Diseno<br/>CSS Variables + Sass]
        Toaster[react-hot-toast]
    end
    
    subgraph "Backend (Django + DRF)"
        direction TB
        subgraph "API Layer"
            Routers[DefaultRouter]
            Views[Views + Viewsets<br/>14 viewsets]
            Serializers[Serializers<br/>25 serializers]
            Auth_Custom[Autenticacion<br/>UsuarioJWTAuth + JWT]
        end
        
        subgraph "Business Logic Layer"
            Usuarios[App: users]
            Productos[App: products]
            Catalog[App: catalog]
            Carts[App: carts]
            Checkout[App: checkout]
            Orders[App: orders]
            Models3D[App: models3d]
            Landing[App: landing]
        end
        
        subgraph "Data Layer"
            Models[Modelos Django<br/>18 modelos]
            Migrations[Migraciones<br/>11 archivos]
            ORM[ORM Django]
        end
        
        subgraph "External Services"
            Cloudinary[Cloudinary<br/>Imagenes + Modelos 3D]
            SMTP[Servicio Email<br/>Gmail SMTP]
        end
    end
    
    subgraph "Microservicio Externo"
        Editor3D[Editor 3D<br/>React + Three.js<br/>Puerto 5174]
    end
    
    subgraph "Infraestructura"
        Docker[Docker Compose]
        SQLite[(SQLite/PostgreSQL)]
    end
    
    Browser -->|HTTP :5173| Frontend
    Browser -->|HTTP :5174| Editor3D
    
    Frontend -->|HTTP :8000/api/| Backend
    
    Backend --> SQLite
    Backend --> Cloudinary
    Backend --> SMTP
    
    Router --> Pages
    Router --> Components
    Context --> Pages
    Services --> Context
    Pages --> Components
    Pages --> Toaster
    
    Routers --> Views
    Views --> Serializers
    Views --> Auth_Custom
    Views --> Business Logic Layer
    Serializers --> Models
    Models --> ORM
    ORM --> Migrations
    Models --> SQLite
    
    Checkout --> Cloudinary
    Orders --> Cloudinary
    Models3D --> Cloudinary
```

## 13.2 Descripcion de Componentes

| Componente | Tecnologia | Proposito |
|------------|-----------|-----------|
| **Frontend SPA** | React 19 + Vite 8 | Interfaz de usuario unica con 23 rutas |
| **API REST** | Django 5.2 + DRF 3.16 | Backend de logica de negocio, 8 apps modulares |
| **Editor 3D** | React + Three.js + Tailwind | Microservicio independiente para personalizacion 3D |
| **Base de Datos** | SQLite/PostgreSQL | Persistencia de datos transaccionales |
| **Cloudinary** | SaaS | Almacenamiento en la nube de imagenes y modelos 3D |
| **Email** | Gmail SMTP | Envio de notificaciones y verificaciones |

## 13.3 Puertos y Comunicacion

| Componente | Puerto | Protocolo |
|------------|--------|-----------|
| Frontend (Vite) | 5173 | HTTP |
| Backend (Gunicorn) | 8000 | HTTP |
| Editor 3D | 5174 | HTTP |
| Base de Datos | - | SQLite (archivo) / PostgreSQL (5432) |
