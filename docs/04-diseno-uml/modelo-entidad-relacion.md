# Modelo Entidad-Relacion

## 15.1 Diagrama Entidad-Relacion

```mermaid
erDiagram
    USUARIO ||--o{ TOKEN_VERIFICACION : genera
    USUARIO ||--o{ CAMBIO_EMAIL : solicita
    USUARIO ||--o{ HISTORIAL_ESTADO_USUARIO : registra
    USUARIO ||--o{ LOG_AUDITORIA : "auditado por"
    USUARIO ||--o{ LOG_AUDITORIA : "afecta a"
    USUARIO ||--o{ CART : posee
    USUARIO ||--o{ ORDER : realiza
    
    PRODUCT ||--o{ PRODUCT_IMAGE : contiene
    PRODUCT ||--o{ VARIANT : tiene
    PRODUCT ||--o{ PRODUCT_AUDIT : registra
    PRODUCT ||--o{ PRODUCT_CATEGORY : clasifica
    CATEGORY ||--o{ PRODUCT_CATEGORY : agrupa
    
    CART ||--o{ CART_ITEM : contiene
    CART_ITEM ||--|| PRODUCT : referencia
    CART_ITEM ||--|| VARIANT : selecciona
    
    ORDER ||--o{ ORDER_ITEM : contiene
    ORDER_ITEM ||--|| PRODUCT : referencia
    ORDER_ITEM ||--|| VARIANT : selecciona
    
    MODEL3D ||--o{ MODEL3D_IMAGE : previsualiza
    
    %% Entidades del sistema
    USUARIO {
        int id PK
        varchar 100 usuario UK
        varchar email UK
        varchar 255 contrasena
        varchar 20 estado
        varchar 20 rol
        datetime fecha_registro
        datetime fecha_ultima_sesion
        bool email_verificado
        int intentos_fallidos
        datetime fecha_bloqueo
        datetime fecha_desbloqueo
        int admin_desbloqueador FK
        bool eliminado
        datetime fecha_eliminacion
        int admin_eliminador FK
    }
    
    TOKEN_VERIFICACION {
        int id PK
        int usuario FK
        varchar 255 token UK
        varchar 30 tipo
        datetime fecha_creacion
        datetime fecha_expiracion
        bool usado
    }
    
    CAMBIO_EMAIL {
        int id PK
        int usuario FK
        varchar email_anterior
        varchar email_nuevo
        int token FK
        datetime fecha_solicitud
        bool verificado
        datetime fecha_verificacion
    }
    
    HISTORIAL_ESTADO_USUARIO {
        int id PK
        int usuario FK
        varchar 20 estado_anterior
        varchar 20 estado_nuevo
        text motivo
        datetime fecha_cambio
        int admin FK
    }
    
    LOG_AUDITORIA {
        int id PK
        int usuario_admin FK
        int usuario_afectado FK
        varchar 255 accion
        json datos_anteriores
        json datos_nuevos
        datetime fecha_accion
        varchar 45 ip_admin
    }
    
    PRODUCT {
        int id PK
        varchar 100 name UK
        varchar 500 description
        decimal 10,2 base_price
        bool is_active
        bool is_approved
        datetime created_at
        datetime updated_at
    }
    
    PRODUCT_IMAGE {
        int id PK
        int product FK
        varchar image
        bool is_main
        smallint order
        datetime created_at
    }
    
    VARIANT {
        int id PK
        int product FK
        varchar 20 size
        varchar 20 color
        int stock
        datetime created_at
    }
    
    PRODUCT_AUDIT {
        int id PK
        int product FK
        varchar 20 action
        varchar 150 actor
        json before_data
        json after_data
        datetime created_at
    }
    
    CATEGORY {
        int id PK
        varchar 100 name UK
        text description
        bool is_active
        datetime created_at
        datetime updated_at
    }
    
    PRODUCT_CATEGORY {
        int product FK
        int category FK
        datetime created_at
    }
    
    CART {
        int id PK
        varchar 64 session_key UK
        int user FK
        datetime created_at
        datetime updated_at
    }
    
    CART_ITEM {
        int id PK
        int cart FK
        int product FK
        int variant FK
        int quantity
        decimal 10,2 unit_price
        datetime created_at
        datetime updated_at
    }
    
    ORDER {
        int id PK
        int user FK
        varchar 150 customer_name
        varchar customer_email
        varchar 20 status
        decimal 10,2 total
        text image
        varchar image_url
        varchar 255 cloudinary_public_id
        varchar 50 design_color
        text logo_texture
        text full_texture
        float logo_scale
        text notes
        datetime created_at
        datetime updated_at
    }
    
    ORDER_ITEM {
        int id PK
        int order FK
        int product FK
        int variant FK
        int quantity
        decimal 10,2 unit_price
    }
    
    CONTACTO {
        int id PK
        varchar 100 nombre
        varchar correo
        varchar 150 asunto
        text mensaje
        varchar 45 ip_origen
        datetime fecha_envio
        bool leido
        datetime fecha_lectura
    }
    
    SEARCH_HISTORY {
        int id PK
        varchar 64 session_key
        varchar 200 query
        json filters
        int results_count
        datetime created_at
    }
    
    POPULAR_SEARCH {
        int id PK
        varchar 200 query UK
        int search_count
        datetime last_searched
        bool is_active
    }
    
    MODEL3D {
        int id PK
        varchar 255 name UK
        text description
        varchar 500 cloudinary_url
        varchar 255 cloudinary_public_id
        varchar 20 file_type
        bigint file_size
        bool is_active
        bool is_approved
        datetime created_at
        datetime updated_at
    }
    
    MODEL3D_IMAGE {
        int id PK
        int model_3d FK
        varchar 500 cloudinary_url
        varchar 255 cloudinary_public_id
        bool is_main
        smallint order
        datetime created_at
    }
    
    CATALOG_FILTER {
        int id PK
        varchar 100 name UK
        varchar 20 filter_type
        json config
        bool is_active
        datetime created_at
    }
```

## 15.2 Convenciones del Modelo

| Aspecto | Convencion |
|---------|-----------|
| **Nombres de tablas** | Plural del nombre del modelo en ingles (ej: `usuarios`, `contactos`, `tokens_verificacion`) configurado via `db_table` |
| **Claves primarias** | `id` AutoField por defecto en todos los modelos |
| **Claves foraneas** | `ForeignKey` con nombre del modelo en singular + `_id` (ej: `usuario_id`, `product_id`) |
| **Soft Delete** | Campo `eliminado` (BooleanField) en Usuario para borrado logico |
| **Auditoria** | Tablas separadas para historial de cambios (ProductAudit, Log_Auditoria, Historial_Estado_Usuario) |
| **Timestamps** | `created_at` y `updated_at` (auto_now_add / auto_now) en casi todas las tablas |
| **Indices** | Indices compuestos en campos de busqueda frecuente (fecha, estado, tipo) |
