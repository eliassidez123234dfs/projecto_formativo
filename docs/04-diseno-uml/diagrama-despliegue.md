# Diagrama de Despliegue

## 14.1 Diagrama de Despliegue (Entorno de Desarrollo)

```mermaid
graph TB
    subgraph "Servidor de Desarrollo (localhost)"
        subgraph "Docker Host"
            direction TB
            
            subgraph "Contenedor Frontend"
                Node[Node.js 20 Alpine]
                Vite[Vite Dev Server<br/>:5173]
                FS_Front["/app (volumen)"]
            end
            
            subgraph "Contenedor Backend"
                Python[Python 3.12 Slim]
                Gunicorn[Gunicorn WSGI<br/>:8000]
                FS_Back["/app (volumen)"]
                MediaVol["media (volumen)"]
                StaticVol["static (volumen)"]
            end
            
            subgraph "Almacenamiento"
                SQLite[(db.sqlite3<br/>archivo en backend/)]
                Media[(Archivos multimedia<br/>volumen: backend_media)]
                Static[(Archivos estaticos<br/>volumen: backend_static)]
            end
        end
        
        subgraph "Host"
            Browser[Chrome/Firefox/Edge]
        end
        
        subgraph "Microservicio Externo"
            Editor3D[Editor 3D<br/>React + Vite<br/>:5174]
        end
    end
    
    subgraph "Servicios Cloud"
        Cloudinary[(Cloudinary<br/>CDN + Transformaciones)]
        Gmail[(Gmail SMTP)]
    end
    
    Browser -->|HTTP :5173| Vite
    Browser -->|HTTP :5174| Editor3D
    
    Vite -->|Proxy /api/*| Gunicorn
    Vite -->|Proxy /media/*| Gunicorn
    
    Gunicorn --> SQLite
    Gunicorn --> Media
    
    Gunicorn -->|API REST| Cloudinary
    Gunicorn -->|SMTP| Gmail
    
    Editor3D --> Cloudinary
```

## 14.2 Diagrama de Despliegue (Entorno de Produccion Propuesto)

```mermaid
graph TB
    subgraph "Internet"
        DNS["redestampacion.com"]
        SSL[SSL/TLS - Certbot]
    end
    
    subgraph "Servidor de Produccion (VPS/Linux)"
        subgraph "Proxy Inverso"
            Nginx[Nginx<br/>:80 -> :443<br/>:443 -> :8000/:5173]
        end
        
        subgraph "Docker Host"
            direction TB
            
            subgraph "Contenedor Frontend"
                Build[Build Estatico<br/>/dist servido por Nginx]
            end
            
            subgraph "Contenedor Backend"
                Gunicorn_Prod[Gunicorn<br/>:8000<br/>4 workers]
                DJANGO[Django + DRF]
            end
            
            subgraph "Contenedor BD"
                PostgreSQL[(PostgreSQL<br/>:5432)]
            end
        end
        
        subgraph "Almacenamiento Persistente"
            Media_Prod[(Volumen media)]
            Static_Prod[(Volumen static)]
            DB_Data[(Volumen postgres)]
        end
    end
    
    subgraph "Servicios Cloud"
        Cloudinary_Prod[(Cloudinary)]
        Gmail_Prod[(Gmail SMTP)]
        Sentry[(Sentry<br/>Opcional)]
    end
    
    Browser_User[Usuario Final] -->|HTTPS| DNS
    DNS -->|:443| Nginx
    
    Nginx -->|/api/* upstream| Gunicorn_Prod
    Nginx -->|/media/*| Media_Prod
    Nginx -->|/static/*| Static_Prod
    Nginx -->|/*| Build
    
    Gunicorn_Prod --> DJANGO
    DJANGO --> PostgreSQL
    
    DJANGO --> Cloudinary_Prod
    DJANGO --> Gmail_Prod
    DJANGO --> Sentry
```

## 14.3 Requisitos de Hardware (Produccion)

| Recurso | Minimo | Recomendado |
|---------|--------|-------------|
| CPU | 2 vCPUs | 4 vCPUs |
| RAM | 2 GB | 4 GB |
| Disco | 20 GB | 50 GB SSD |
| SO | Ubuntu 22.04 / Debian 12 | Ubuntu 24.04 LTS |
| Docker | 24+ | 25+ |
| Docker Compose | 2.20+ | 2.30+ |
