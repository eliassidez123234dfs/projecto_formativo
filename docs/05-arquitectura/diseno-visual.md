# Guía de diseño del proyecto

> Migrado desde `/DESIGN_GUIDE.md` (raíz) a la estructura oficial de documentación.

Este documento describe los principios de diseño visual y los criterios de interfaz para el proyecto.

## Principios de diseño

- Claridad: la interfaz debe ser legible y fácil de entender.
- Jerarquía visual: los elementos más importantes deben destacarse con tamaño, color y espacio.
- Consistencia: los componentes deben seguir un patrón visual uniforme.
- Responsividad: la interfaz debe adaptarse a diferentes tamaños de pantalla.
- Simplicidad: priorizar la funcionalidad evitando elementos innecesarios.

## Paleta de colores

- Primario: #dc2626
- Blanco: #ffffff
- Texto principal: #111111
- Texto secundario: #4b5563
- Fondo secundario: #f8fafc
- Borde: #d1d5db

## Tipografía

- Familia principal: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif.
- Peso de títulos: 600 o 700.
- Peso de texto de cuerpo: 400.
- Espaciado de línea sugerido: 1.5.

## Componentes principales

### Botones

- Botón primario: fondo #dc2626, texto blanco.
- Botón secundario: borde #dc2626, fondo transparente.
- Botón deshabilitado: fondo #e5e7eb, texto #9ca3af.
- Esquinas con radio de 0.75rem.
- Transición de color de fondo de 150ms.

### Formularios

- Bordes de 1px sólidos en #d1d5db.
- Relleno interno de 0.75rem.
- Texto en #111827.
- Indicadores de error en #dc2626.

### Tarjetas

- Fondo blanco.
- Borde suave de 1px en #e5e7eb.
- Sombra ligera para separación visual.
- Relleno interno de 1.25rem.

## Diseño de páginas

### Landing

- Secciones claras: encabezado, propuesta de valor, características, productos destacados y pie de página.
- Enfoque en la conversión: llamadas a la acción visibles.
- Uso de espacios amplios para favorecer la lectura.

### Autenticación

- Layout sencillo con alternancia entre login y registro.
- Campos claros y botones de acción bien definidos.
- Mensajes de error visibles y comprensibles.

### Catálogo

- Filtros a la vista en escritorio y en modal en móvil.
- Grid de productos responsive.
- Tarjetas de producto con información concisa.

### Detalle de producto

- Imagen principal con miniaturas.
- Información clara de precio, variantes y stock.
- Botones de acción para agregar al carrito y acceder al editor.

### Dashboard de usuario

- Navegación lateral o superior según el tamaño de pantalla.
- Secciones para perfil, órdenes y carrito.
- Formularios y tablas ordenadas.

## Responsive

- Desktop: diseño de varias columnas y navegación completa.
- Tablet: sidebar colapsable y disposición en dos columnas.
- Móvil: navegación vertical y elementos táctiles grandes.

## Recomendaciones

- Mantener el texto conciso.
- Priorizar el contraste en botones y enlaces.
- Evitar colores conflictivos.
- Garantizar legibilidad en todas las resoluciones.
