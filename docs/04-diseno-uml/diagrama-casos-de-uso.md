# Diagrama de Casos de Uso

## 9.1 Diagrama General

```mermaid
graph TB
    subgraph "Sistema RED - Tienda de Ropa Virtual"
        direction TB
        
        %% Actores
        actor Visitante as Visitante
        actor UsuarioAutenticado as Usuario Autenticado
        actor Administrador as Administrador
        
        %% Casos de Uso - Autenticacion
        UC1(Registrarse)
        UC2(Iniciar Sesion)
        UC3(Cerrar Sesion)
        UC4(Recuperar Contrasena)
        UC5(Verificar Email)
        
        %% Casos de Uso - Catalogo
        UC6(Ver Catalogo)
        UC7(Buscar Productos)
        UC8(Filtrar Productos)
        UC9(Ver Detalle Producto)
        
        %% Casos de Uso - Carrito
        UC10(Agregar al Carrito)
        UC11(Ver Carrito)
        UC12(Actualizar Cantidad)
        UC13(Eliminar Item)
        UC14(Vaciar Carrito)
        
        %% Casos de Uso - Checkout
        UC15(Ver Resumen Compra)
        UC16(Confirmar Pedido)
        
        %% Casos de Uso - Usuario
        UC17(Ver Perfil)
        UC18(Editar Perfil)
        UC19(Cambiar Contrasena)
        
        %% Casos de Uso - Administrador
        UC20(Gestionar Usuarios)
        UC21(Gestionar Productos)
        UC22(Ver Estadisticas)
        UC23(Gestionar Carritos)
        UC24(Gestionar Contacto)
        UC25(Ver Auditoria)
        UC26(Gestionar Modelos 3D)
        
        %% Relaciones Visitante
        Visitante --- UC1
        Visitante --- UC2
        Visitante --- UC4
        Visitante --- UC6
        Visitante --- UC7
        Visitante --- UC8
        Visitante --- UC9
        Visitante --- UC10
        Visitante --- UC11
        Visitante --- UC12
        Visitante --- UC13
        Visitante --- UC14
        Visitante --- UC15
        
        %% Relaciones Usuario Autenticado (hereda de Visitante)
        UsuarioAutenticado --- UC3
        UsuarioAutenticado --- UC5
        UsuarioAutenticado --- UC16
        UsuarioAutenticado --- UC17
        UsuarioAutenticado --- UC18
        UsuarioAutenticado --- UC19
        
        %% Relaciones Administrador (hereda de Usuario Autenticado)
        Administrador --- UC20
        Administrador --- UC21
        Administrador --- UC22
        Administrador --- UC23
        Administrador --- UC24
        Administrador --- UC25
        Administrador --- UC26
        
        %% Include / Extend
        UC1 ..> UC5 : <<include>>
        UC2 ..> UC10 : <<include>>
        UC16 ..> UC11 : <<include>>
    end
```

## 9.2 Descripcion de Actores

| Actor | Descripcion |
|-------|-------------|
| **Visitante** | Usuario no autenticado que puede navegar el catalogo, buscar productos y gestionar un carrito de compras temporal asociado a su sesion. |
| **Usuario Autenticado** | Visitante que ha iniciado sesion. Puede realizar pedidos, gestionar su perfil y cambiar su contrasena. Su carrito anonimo se fusiona con el carrito del usuario. |
| **Administrador** | Usuario con rol de administrador que tiene acceso completo al panel de administracion: gestion de usuarios, productos, carritos, modelos 3D, contacto y auditoria. |

## 9.3 Matriz de Casos de Uso vs Requisitos Funcionales

| Caso de Uso | RF Asociados |
|-------------|-------------|
| Registrarse | RF-001 |
| Iniciar Sesion | RF-008 |
| Cerrar Sesion | RF-012 |
| Recuperar Contrasena | RF-002 |
| Verificar Email | RF-003, RF-009 |
| Ver Catalogo | RF-027 |
| Buscar Productos | RF-028, RF-033 |
| Filtrar Productos | RF-029, RF-030 |
| Ver Detalle Producto | RF-032 |
| Agregar al Carrito | RF-034 |
| Ver Carrito | RF-035 |
| Actualizar Cantidad | RF-036 |
| Eliminar Item | RF-037 |
| Vaciar Carrito | RF-038 |
| Ver Resumen Compra | RF-040 |
| Confirmar Pedido | RF-041, RF-042, RF-043, RF-044, RF-045 |
| Ver Perfil | RF-010 |
| Editar Perfil | RF-010 |
| Cambiar Contrasena | RF-010 |
| Gestionar Usuarios | RF-013, RF-014, RF-015, RF-016, RF-017, RF-018, RF-019, RF-020 |
| Gestionar Productos | RF-021, RF-022, RF-023, RF-024, RF-025, RF-026 |
| Ver Estadisticas | RF-053 |
| Gestionar Carritos | RF-056 |
| Gestionar Contacto | RF-050, RF-051, RF-052 |
| Ver Auditoria | RF-057 |
| Gestionar Modelos 3D | RF-046, RF-047, RF-048, RF-049 |
