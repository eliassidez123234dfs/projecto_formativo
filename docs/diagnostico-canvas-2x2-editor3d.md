# Diagnóstico: Bug visual del canvas 2x2 en editor Tshirt3D

**Fecha:** 10 de septiembre de 2026

---

## Síntoma
El modelo 3D de la camiseta se ve "partido" en 4 cuadrantes grandes (2x2). Algunos muestran el modelo correctamente, otros aparecen en blanco liso. Solo ocurre en navegador de escritorio, no en celular.

## Causa raíz

**`transition-all` en el contenedor del Canvas de Three.js**

**Archivo:** `microservices/Tshirt3D/src/canvas/index.jsx`, línea 44
```jsx
className="w-full max-w-full h-full transition-all ease-in"
```

### Mecanismo del bug

1. `transition-all` aplica `transition: all 150ms` al div contenedor del canvas
2. Cuando R3F detecta un cambio de tamaño (via `ResizeObserver`), llama `renderer.setSize()` que configura el framebuffer WebGL **instantáneamente**
3. El div CSS **sigue animando** hacia el tamaño final durante 150ms
4. Durante esos 150ms, el framebuffer WebGL tiene el tamaño final pero el div CSS tiene un tamaño intermedio
5. Con `dpr=2` (pantalla HiDPI de escritorio), el framebuffer es 2x → se genera el patrón de 2x2 cuadrantes

### Por qué solo pasa en desktop

- **Mobile**: layout más estable, menos triggers de reflow, ResizeObserver dispara una vez
- **Desktop**: hover effects, scroll, zoom del navegador, `dpr` mayor (2-3) amplifican el mismatch

## Contribuciones

| Factor | Archivo | Línea |
|--------|---------|-------|
| `transition-all` en Canvas | `canvas/index.jsx` | 44 |
| `transition-all` en `<main>` | `App.jsx` | 73 |
| Sin `dpr` explícito | `canvas/index.jsx` | 40 |

## Solución

1. Eliminar `transition-all` del Canvas y del `<main>`
2. Agregar `dpr={[1, 2]}` al Canvas para limitar el pixel ratio
