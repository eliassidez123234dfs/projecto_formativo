workspace "RED Estampacion" "Arquitectura del Sistema de Comercio Electrónico y Personalización 3D" {

    model {
        user = person "Cliente Final" "Usuario que navega por el catálogo, personaliza prendas en 3D y realiza compras."
        admin = person "Administrador" "Gestiona usuarios, productos, variantes y monitorea ventas y auditoría."

        redSystem = softwareSystem "RED Estampación System" "Sistema integral de e-commerce y personalización 3D." {
            frontend = container "Frontend SPA" "Interfaz web del usuario." "React 19 + Vite" "Web Browser"
            micro3d = container "Microservicio 3D" "Editor interactivo de personalización." "Three.js + React Three Fiber" "Web Browser"
            
            backend = container "Backend REST API" "API central de negocio, autenticación y gestión de pedidos." "Django 5.2 + DRF 3.16" {
                authComponent = component "Auth & Security" "Manejo de JWT (httpOnly), CSP y permisos." "SimpleJWT + Django Security"
                userModule = component "Módulo Users" "Gestión de usuarios, auditoría y perfiles." "Django App"
                productModule = component "Módulo Products" "Gestión de catálogo, variantes e imágenes." "Django App"
                cartModule = component "Módulo Carts" "Carrito de compras efímero y persistente." "Django App"
                orderModule = component "Módulo Orders" "Órdenes, ciclo de vida y facturas." "Django App"
                checkoutModule = component "Módulo Checkout" "Integración de pagos con Wompi." "Django App"
            }

            primaryDb = container "Base de Datos Relacional" "Almacena usuarios, productos, órdenes y facturas." "PostgreSQL / SQLite" "Database"
            mongoDb = container "Base de Datos NoSQL" "Almacena borradores de diseños 3D y logs de auditoría." "MongoDB" "Database"
        }

        cloudinary = softwareSystem "Cloudinary CDN" "Almacenamiento y optimización de imágenes y archivos GLB." "External SaaS"
        wompi = softwareSystem "Pasarela Wompi" "Procesamiento de pagos con tarjeta, PSE y Nequi." "External Payment Gateway"
        smtp = softwareSystem "Servidor SMTP" "Envío de correos de verificación y notificaciones." "External Service"

        # Relaciones del Modelo C4
        user -> frontend "Navega y realiza compras usando" "HTTPS"
        user -> micro3d "Diseña ropa en 3D usando" "HTTPS"
        admin -> frontend "Administra la plataforma en" "HTTPS"

        frontend -> backend "Consume API REST vía JSON" "HTTPS/JSON"
        micro3d -> cloudinary "Carga y descarga texturas/GLB" "HTTPS"

        backend -> primaryDb "Lee y escribe datos relacionales con ORM" "SQL"
        backend -> mongoDb "Guarda diseños y auditoría" "PyMongo"
        backend -> cloudinary "Suba y administra recursos multimedia" "HTTPS REST"
        backend -> wompi "Procesa transacciones y recibe Webhooks" "HTTPS REST / Webhook"
        backend -> smtp "Envía correos electrónicos" "SMTP/TLS"
    }

    views {
        systemContext redSystem "ContextoSystem" {
            include *
            autolayout lr
        }

        container redSystem "ContenedoresSystem" {
            include *
            autolayout lr
        }

        component backend "ComponentesBackend" {
            include *
            autolayout lr
        }

        styles {
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Container" {
                background #438dd5
                color #ffffff
            }
            element "Database" {
                shape Cylinder
                background #2563eb
                color #ffffff
            }
            element "External SaaS" {
                background #999999
                color #ffffff
            }
            element "External Payment Gateway" {
                background #059669
                color #ffffff
            }
        }
    }
}
