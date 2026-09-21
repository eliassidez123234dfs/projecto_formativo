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


## 14.4 Diagrama de Despliegue en PlantUML (.puml)

El archivo de especificación PlantUML para el entorno de despliegue e infraestructura se encuentra en [`docs/04-diseno-uml/despliegue-proyecto.puml`](file:///home/South_Knight/Documentos/projecto_final/projecto_formativo/docs/04-diseno-uml/despliegue-proyecto.puml) y su imagen renderizada en [`docs/04-diseno-uml/arquitectura_despliegue_red.png`](file:///home/South_Knight/Documentos/projecto_final/projecto_formativo/docs/04-diseno-uml/arquitectura_despliegue_red.png):

```plantuml
@startuml arquitectura_despliegue_red
!theme carbon-gray
skinparam componentStyle uml2
skinparam backgroundColor #FFFFFF

title Diagrama de Despliegue en Producción / Infraestructura - RED Estampación

node "Dispositivo Cliente" {
  [Navegador Web (Chrome/Firefox/Safari)] as Browser
}

node "Plataforma PaaS / Cloud (Render / VPS)" {
  
  package "Frontend Container / Static Host" {
    node "Nginx / Node Web Server" {
      [React 19 Bundle (:5173 / HTTP)] as WebApp
    }
  }

  package "3D Microservice Container" {
    node "Vite Node Server" {
      [Tshirt3D App (:5174 / HTTP)] as App3D
    }
  }

  package "Backend Container (Docker)" {
    node "Gunicorn WSGI Application Server (:8000)" {
      [Django REST Framework Engine] as BackendEngine
      [Django ORM] as ORM
      [WSGI Middleware / Security] as SecurityMW
    }
  }

  package "Database Node" {
    database "PostgreSQL 16 Engine (:5432)" as PostgresDB {
      folder "Tablas Relacionales (21 tablas)"
    }
  }

  package "NoSQL Cache & Store" {
    database "MongoDB Cluster / Instance" as Mongo
  }
}

cloud "Servicios SaaS / Cloud Externos" {
  node "Cloudinary (Media CDN)" as Cloudinary
  node "Pasarela Wompi API" as Wompi
  node "Servidor SMTP (Gmail/SendGrid)" as SMTP
}

Browser --> WebApp : HTTPS / Port 443 (:5173)
Browser --> App3D : HTTPS / Port 443 (:5174)
Browser --> BackendEngine : HTTPS API Requests (:8000/api/)

BackendEngine --> SecurityMW
SecurityMW --> ORM
ORM --> PostgresDB : TCP/IP SQL Protocol (:5432)
BackendEngine --> Mongo : PyMongo Driver (NoSQL)

BackendEngine --> Cloudinary : HTTPS REST Upload
BackendEngine --> Wompi : HTTPS REST Transactions
BackendEngine --> SMTP : TLS / SMTP Protocol (:587)
Wompi --> BackendEngine : Webhook Notification (HTTPS POST)

@enduml
```

