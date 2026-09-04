# Endpoints de Usuarios

## Base: `/api/usuarios/`

### GET /api/usuarios/perfil/
Obtiene los datos del perfil del usuario autenticado.

**Autenticacion:** JWT Requerido

**Response (200):**
```json
{
    "id": 1,
    "usuario": "juanperez",
    "correo": "juan@example.com",
    "estado": "Activo",
    "rol": "Usuario",
    "fecha_registro": "2026-07-01T12:00:00Z",
    "email_verificado": true,
    "fecha_ultima_sesion": "2026-07-01T14:00:00Z",
    "intentos_fallidos": 0,
    "fecha_bloqueo": null,
    "eliminado": false,
    "fecha_eliminacion": null
}
```

### PUT/PATCH /api/usuarios/actualizar_perfil/
Actualiza los datos del perfil del usuario autenticado.

**Autenticacion:** JWT Requerido

**Request:**
```json
{
    "usuario": "juanperez_actualizado",
    "correo": "juan.nuevo@example.com",
    "contrasena_actual": "MiPassword123!"
}
```

**Response (200):**
```json
{
    "mensaje": "Perfil actualizado exitosamente",
    "usuario": {
        "id": 1,
        "usuario": "juanperez_actualizado",
        "correo": "juan.nuevo@example.com"
    }
}
```

### POST /api/usuarios/cambiar_password/
Cambia la contrasena del usuario autenticado.

**Autenticacion:** JWT Requerido

**Request:**
```json
{
    "contrasena_actual": "MiPassword123!",
    "contrasena_nueva": "NuevaPass456@",
    "confirmar_contrasena": "NuevaPass456@"
}
```

**Response (200):**
```json
{
    "mensaje": "Contrasena actualizada exitosamente"
}
```

---

## Base: `/api/admin/usuarios/`

### GET /api/admin/usuarios/
Lista todos los usuarios (solo administradores).

**Autenticacion:** JWT Requerido (rol=Administrador)

**Parametros Query:**
| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `search` | string | Busqueda por usuario, correo o ID |
| `estado` | string | Filtrar por estado (Activo/Inactivo/Bloqueado) |
| `rol` | string | Filtrar por rol (Administrador/Usuario) |
| `email_verificado` | bool | Filtrar por verificacion de email |
| `eliminado` | bool | Incluir usuarios eliminados (default: False) |
| `page` | int | Numero de pagina |
| `page_size` | int | Elementos por pagina (5-100) |

**Response (200):**
```json
{
    "count": 50,
    "next": "http://localhost:8000/api/admin/usuarios/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "usuario": "admin",
            "correo": "admin@example.com",
            "estado": "Activo",
            "rol": "Administrador",
            "email_verificado": true,
            "fecha_registro": "2026-07-01T12:00:00Z"
        }
    ]
}
```

### GET /api/admin/usuarios/suggest/
Sugerencias de usuarios (typeahead). Requiere minimo 3 caracteres.

**Parametros Query:** `?search=juan`

**Response (200):** Maximo 10 resultados.

### POST /api/admin/usuarios/
Crea un nuevo usuario manualmente.

**Request:**
```json
{
    "usuario": "nuevo_usuario",
    "correo": "nuevo@example.com",
    "contrasena": "TempPass123!",
    "estado": "Activo",
    "rol": "Usuario"
}
```

**Response (201):**
```json
{
    "mensaje": "Usuario creado exitosamente",
    "usuario": { "...datos del usuario..." }
}
```

### PATCH /api/admin/usuarios/{id}/
Actualiza datos de un usuario existente.

**Restricciones:** No puede cambiar su propio rol, no puede desactivarse a si mismo, no puede cambiar el rol del unico admin activo.

### POST /api/admin/usuarios/{id}/cambiar_estado/
Cambia el estado de un usuario.

**Request:**
```json
{
    "estado": "Bloqueado",
    "motivo": "Violacion de terminos"
}
```

### POST /api/admin/usuarios/{id}/desbloquear/
Desbloquea una cuenta bloqueada.

### POST /api/admin/usuarios/{id}/resetear_password/
Genera una contrasena temporal y la envia por correo.

### POST /api/admin/usuarios/{id}/eliminar_logicamente/
Realiza eliminacion logica de un usuario.

### GET /api/admin/usuarios/auditoria/
Lista el log de auditoria de acciones administrativas.

**Parametros Query:**
| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `usuario_admin` | int | Filtrar por ID del administrador |
| `usuario_afectado` | int | Filtrar por ID del usuario afectado |
| `fecha_inicio` | date | Fecha inicio del rango |
| `fecha_fin` | date | Fecha fin del rango |
| `page` | int | Pagina |
| `page_size` | int | Items por pagina |

---

## Base: `/api/auth/`

### POST /api/auth/reenviar_verificacion/
Reenvia el correo de verificacion. Maximo 3 reenvios en 24 horas.

**Request:**
```json
{
    "correo": "juan@example.com"
}
```

### POST /api/auth/recuperar_password/
Solicita recuperacion de contrasena. Envia token por correo (expira en 1 hora).

**Request:**
```json
{
    "correo": "juan@example.com"
}
```

### POST /api/auth/nueva_password/
Establece nueva contrasena usando el token de recuperacion.

**Request:**
```json
{
    "token": "a1b2c3d4e5f6...",
    "contrasena": "NuevaPass456@",
    "confirmar_contrasena": "NuevaPass456@"
}
```
