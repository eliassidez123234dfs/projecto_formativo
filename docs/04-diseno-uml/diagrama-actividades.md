# Diagrama de Actividades

## 12.1 Actividad: Agregar Producto al Carrito

```mermaid
stateDiagram-v2
    [*] --> SeleccionarProducto
    SeleccionarProducto --> ElegirVariante
    ElegirVariante --> ElegirCantidad
    
    state ValidarStock <<choice>>
    ElegirCantidad --> ValidarStock
    
    ValidarStock --> StockInsuficiente: stock < cantidad
    StockInsuficiente --> [*]
    
    ValidarStock --> EnviarAPI: stock >= cantidad
    EnviarAPI --> ProcesarAPI
    
    state ProcesarAPI {
        [*] --> BuscarItemExistente
        BuscarItemExistente --> ItemExiste: mismo producto + variante
        BuscarItemExistente --> CrearItemNuevo: no existe
        
        ItemExiste --> SumarCantidades
        SumarCantidades --> ValidarStockTotal
        
        state ValidarStockTotal <<choice>>
        ValidarStockTotal --> ErrorStock: supera stock
        
        CrearItemNuevo --> GuardarItem
        SumarCantidades --> GuardarItem: stock suficiente
        GuardarItem --> [*]
    }
    
    ProcesarAPI --> MostrarExito: 201 OK
    MostrarExito --> ActualizarCarrito
    ActualizarCarrito --> [*]
    
    ProcesarAPI --> MostrarError: 400 Error
    MostrarError --> [*]
    ErrorStock --> MostrarError
    
    state MostrarExito {
        [*] --> ToastSuccess
        ToastSuccess --> ActualizarContadorHeader
        ActualizarContadorHeader --> [*]
    }
```

## 12.2 Actividad: Publicacion de Producto (Administrador)

```mermaid
stateDiagram-v2
    [*] --> VerificarRequisitos
    
    state VerificarRequisitos {
        [*] --> TieneNombre
        TieneNombre --> TieneDescripcion
        TieneDescripcion --> TieneImagenPrincipal
        TieneImagenPrincipal --> TieneVarianteConStock
        TieneVarianteConStock --> [*]
    }
    
    VerificarRequisitos --> ChecklistIncompleto: falta algun requisito
    ChecklistIncompleto --> MostrarChecklist
    MostrarChecklist --> EditarProducto
    EditarProducto --> VerificarRequisitos
    
    VerificarRequisitos --> ConfirmarPublicacion: todo OK
    ConfirmarPublicacion --> EnviarPublicacion
    
    EnviarPublicacion --> ProcesarAPI
    
    state ProcesarAPI {
        [*] --> ValidarProducto
        ValidarProducto --> ActivarProducto: is_active=True
        ActivarProducto --> AprobarProducto: is_approved=True
        AprobarProducto --> CrearAuditEntry: action=published
        CrearAuditEntry --> [*]
    }
    
    ProcesarAPI --> ProductoPublicado
    ProductoPublicado --> [*]
    
    ProcesarAPI --> ErrorAPI
    ErrorAPI --> [*]
```

## 12.3 Actividad: Autenticacion y Bloqueo por Intentos Fallidos

```mermaid
stateDiagram-v2
    [*] --> IngresarCredenciales
    IngresarCredenciales --> ValidarCredenciales
    
    state ValidarCredenciales <<choice>>
    ValidarCredenciales --> CredencialesValidas: exito
    
    CredencialesValidas --> ResetearIntentos
    ResetearIntentos --> GenerarTokens
    GenerarTokens --> MigrarCarrito
    MigrarCarrito --> RotarSesion
    RotarSesion --> LoginExitoso
    LoginExitoso --> [*]
    
    ValidarCredenciales --> CredencialesInvalidas: fallo
    
    CredencialesInvalidas --> UsuarioBloqueado: estado=Bloqueado
    
    state UsuarioBloqueado <<choice>>
    UsuarioBloqueado --> ErrorCuentaBloqueada: si
    ErrorCuentaBloqueada --> [*]
    
    UsuarioBloqueado --> UsuarioInactivo: estado=Inactivo
    UsuarioInactivo --> ErrorEmailNoVerificado
    ErrorEmailNoVerificado --> [*]
    
    UsuarioBloqueado --> IncrementarIntentos: estado=Activo
    IncrementarIntentos --> AlcanzoLimite: intentos >= 5
    
    AlcanzoLimite --> BloquearCuenta
    BloquearCuenta --> ErrorCuentaBloqueada
    ErrorCuentaBloqueada --> [*]
    
    IncrementarIntentos --> BajoLimite: intentos < 5
    BajoLimite --> ErrorCredenciales
    ErrorCredenciales --> [*]
```
