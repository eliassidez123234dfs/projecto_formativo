# Autenticacion

## 22.1 Mecanismo de Autenticacion

RED utiliza **JWT (JSON Web Token)** para la autenticacion de API, implementado con la libreria `djangorestframework-simplejwt`. Adicionalmente, se utiliza **autenticacion por sesion** (SessionAuthentication) para los endpoints del carrito de compras, permitiendo que usuarios anonimos mantengan un carrito persistente.

### Componentes de Autenticacion

| Componente | Archivo | Proposito |
|------------|---------|-----------|
| `UsuarioJWTAuthentication` | `users/api/auth_backend.py` | Autenticacion JWT personalizada que usa el modelo `Usuario` en vez de `auth.User` |
| `LoginSerializer` | `users/api/serializers.py` | Validacion de credenciales y control de intentos fallidos |
| `LoginViewSet` | `users/api/viewset.py` | Endpoint de login con generacion de tokens y migracion de carrito |
| `AdminPermission` | `users/api/admin_viewset.py` | Permiso personalizado que verifica rol=Administrador y estado=Activo |

### Flujo de Autenticacion Completo

```
1. Registro:   POST /api/auth/registro/  -> Crea usuario, envia token verificacion
2. Verificar:  POST /api/auth/verificar_email/ -> Activa cuenta
3. Login:      POST /api/login/login/    -> Genera tokens JWT
4. API Calls:  Header: Authorization: Bearer <access_token>
5. Refresh:    POST /api/token/refresh/  -> Obtiene nuevo access_token
6. Logout:     POST /api/login/logout/   -> Rotacion de sesion
```

## 22.2 Endpoints de Autenticacion

### POST /api/auth/registro/
Registro de nuevo usuario.

**Request:**
```json
{
    "usuario": "juanperez",
    "correo": "juan@example.com",
    "contrasena": "MiPassword123!",
    "confirmar_contrasena": "MiPassword123!"
}
```

**Response (201):**
```json
{
    "mensaje": "Registro exitoso. Verifica tu correo para activar la cuenta.",
    "usuario": {
        "id": 1,
        "usuario": "juanperez",
        "correo": "juan@example.com",
        "estado": "Inactivo",
        "rol": "Usuario",
        "email_verificado": false,
        "fecha_registro": "2026-07-01T12:00:00Z"
    },
    "email_enviado": true
}
```

**Errores:**
```json
// 400 - Datos invalidos
{
    "usuario": ["El nombre de usuario ya existe."],
    "contrasena": ["Debe contener al menos una mayuscula."]
}

// 400 - Contrasenas no coinciden
{
    "non_field_errors": ["Las contrasenas no coinciden."]
}
```

### POST /api/auth/verificar_email/
Verifica el correo electronico mediante token.

**Request:**
```json
{
    "token": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
    "mensaje": "Email verificado exitosamente. Ya puedes iniciar sesion.",
    "usuario": {
        "id": 1,
        "usuario": "juanperez",
        "correo": "juan@example.com",
        "estado": "Activo",
        "email_verificado": true
    }
}
```

### POST /api/login/login/
Inicio de sesion. Genera tokens JWT y migra carrito anonimo.

**Request:**
```json
{
    "correo": "juan@example.com",
    "contrasena": "MiPassword123!"
}
```

**Response (200):**
```json
{
    "mensaje": "Login exitoso",
    "usuario": {
        "id": 1,
        "usuario": "juanperez",
        "correo": "juan@example.com",
        "estado": "Activo",
        "rol": "Usuario",
        "email_verificado": true,
        "fecha_registro": "2026-07-01T12:00:00Z",
        "fecha_ultima_sesion": "2026-07-01T14:00:00Z"
    },
    "access": "eyJhbGciOiJIUzI1NiIs...",
    "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errores:**
```json
// 401 - Credenciales invalidas
{
    "non_field_errors": ["Credenciales invalidas."]
}

// 401 - Cuenta bloqueada
{
    "non_field_errors": ["Tu cuenta esta bloqueada. Contacta al administrador."]
}

// 401 - Email no verificado
{
    "non_field_errors": ["Tu cuenta no ha sido activada. Verifica tu correo."]
}
```

### POST /api/login/logout/
Cierre de sesion. Requiere autenticacion.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
    "mensaje": "Sesion cerrada exitosamente"
}
```

### POST /api/token/refresh/
Refresca el access token.

**Request:**
```json
{
    "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
    "access": "eyJhbGciOiJIUzI1NiIs...",
    "access_expiration": "2026-07-01T14:15:00Z"
}
```

## 22.3 Formato del Token JWT

**Payload del access_token:**
```json
{
    "token_type": "access",
    "exp": 1719821700,
    "iat": 1719820800,
    "jti": "abc123def456",
    "user_id": 1
}
```

**Payload del refresh_token:**
```json
{
    "token_type": "refresh",
    "exp": 1720425600,
    "iat": 1719820800,
    "jti": "ghi789jkl012",
    "user_id": 1
}
```
