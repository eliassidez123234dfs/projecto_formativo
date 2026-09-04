/**
 * constants.js  —  Constantes globales de la aplicación
 * ────────────────────────────────────────────────────────────────────────
 * Define valores reutilizables en toda la app para mantener
 * la configuración centralizada y evitar duplicación de strings.
 */

/** Imagen placeholder SVG que se muestra cuando un producto no tiene imagen asociada. */
const DEFAULT_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
  '<rect width="400" height="400" fill="#e5e7eb"/>' +
  '<g transform="translate(200,160)">' +
  '<rect x="-40" y="-30" width="80" height="60" rx="4" fill="#d1d5db" stroke="#9ca3af" stroke-width="1.5"/>' +
  '<circle cx="-10" cy="-10" r="8" fill="#9ca3af"/><rect x="5" y="-18" width="30" height="20" rx="2" fill="#9ca3af"/>' +
  '</g>' +
  '<text x="200" y="240" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#9ca3af" font-weight="500">Sin imagen</text>' +
  '</svg>'
)

export { DEFAULT_IMAGE }
