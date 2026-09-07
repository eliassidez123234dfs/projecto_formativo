> ⚠️ **Documento Original** — Guía de uso del admin panel original. Para la documentación actual del panel consulta [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) y [SETUP_GUIDE.md](../SETUP_GUIDE.md).

# 🎨 Guía de Uso del Panel de Admin Profesional

## Acceso al Panel

### 1. **Iniciar Sesión**
- Ir a `/login`
- Usar credenciales de usuario con rol `Administrador`
- Después de login, serás redirigido automáticamente a `/admin-users`

### 2. **Navegación**
Una vez en el panel, verás:
- **Barra lateral izquierda** (sidebar) con menú de navegación
- **Encabezado** con título de la página
- **Contenido principal** con la funcionalidad

## Características del Panel

### 🌙 Tema Claro/Oscuro
1. Haz clic en el icono de luna/sol en la **barra lateral inferior**
2. El tema se cambia inmediatamente
3. La preferencia se guarda automáticamente en tu navegador

### 📋 Gestión de Usuarios (`/admin-users`)

#### Buscar y Filtrar
- **Campo de búsqueda**: Busca por nombre de usuario, correo o ID
- **Filtro por Estado**: Activo, Inactivo, Bloqueado
- **Filtro por Rol**: Usuario, Administrador
- **Resultados por página**: 10, 25 o 50 usuarios

#### Crear Nuevo Usuario
1. Haz clic en el botón **"+ Crear Usuario"** arriba a la derecha
2. Completa el formulario:
   - Nombre de usuario
   - Correo
   - Contraseña
   - Rol (Usuario o Administrador)
3. Haz clic en **"Guardar"**

#### Editar Usuario
1. En la tabla, haz clic en **"Editar"** para el usuario
2. Se abrirá un modal con los datos actuales
3. Modifica los campos que necesites
4. Haz clic en **"Guardar"**

### 📦 Gestión de Productos (`/admin-products`)
- Interfaz similar a la de usuarios
- Crea, edita y gestiona productos del catálogo
- Mismos controles de búsqueda y filtrado

### 📊 Dashboard
- Accesible desde el menú lateral
- Mostrará estadísticas y resumen de la plataforma (próximamente)

## Estilos y Colores

### Paleta de Colores
- **Primario**: Rojo Crimson (#dc143c)
- **Fondo**: Blanco (claro) / Gris oscuro (oscuro)
- **Barra lateral**: Gris muy oscuro (#111 / #2a2a2a)
- **Texto**: Oscuro (claro) / Claro (oscuro)

### Elementos UI
- **Botones primarios**: Gris oscuro con texto blanco
- **Botones secundarios**: Borde gris, transparente
- **Botones de acento**: Rojo Crimson
- **Badges**: Colores por estado (verde=activo, rojo=bloqueado, gris=inactivo)

## Responsive Design

### Desktop (1024px+)
- Sidebar completo (220px)
- Grid de filtros 4 columnas
- Tabla con scroll horizontal si es necesario

### Tablet (768px - 1023px)
- Sidebar colapsable
- Grid de filtros 2 columnas
- Botones de navegación compactos

### Mobile (< 768px)
- Sidebar como modal (presiona ☰)
- Filtros en una sola columna
- Interfaz optimizada para touch

## Accesos Directos

| Página | URL | Descripción |
|--------|-----|-------------|
| Usuarios | `/admin-users` | Gestión de usuarios |
| Productos | `/admin-products` | Gestión de productos |
| Dashboard | `/dashboard` | Inicio/resumen |

## Atajos y Tips

1. **Cambiar tema**: Click en 🌙/☀️ en la barra lateral
2. **Buscar rápido**: Escribe en el campo de búsqueda (búsqueda en tiempo real con 400ms de debounce)
3. **Sidebar colapsable**: Click en ✕ (desktop) o ☰ (móvil) para expandir/contraer
4. **Cerrar modal**: Click en "Cancelar" o ✕ en la esquina

## Información del Usuario

En la **parte inferior de la barra lateral** verás:
- Tu inicial en un avatar rojo
- Tu nombre de usuario
- Tu rol (Administrador/Usuario)

En vista colapsada, solo ves el avatar.

## Estados de Usuario

- 🟢 **Activo**: Usuario puede iniciar sesión
- ⚪ **Inactivo**: Usuario inactivo (temporal)
- 🔴 **Bloqueado**: Usuario bloqueado (no puede iniciar sesión)

## Próximas Características

- Acciones adicionales: Cambiar estado, Resetear contraseña
- Búsqueda global en la barra superior
- Reportes y estadísticas
- Exportar datos a CSV
- Auditoría de cambios

---

**¿Problemas?** Verifica que:
1. Estés logueado como administrador
2. El servidor backend esté corriendo
3. La URL sea correcta (`http://localhost:5175/admin-users`)
