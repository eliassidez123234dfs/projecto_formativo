/**
 * editor3d.js  —  Utilidades para abrir el editor 3D (microservicio Tshirt3D)
 *
 * Construye la URL del editor con los parámetros del producto/variante y lo
 * abre en una pestaña nueva. Los parámetros viajan en la query string para
 * que el editor pueda aplicar el color inicial y guardar el diseño en el
 * carrito con la talla/cantidad seleccionadas.
 *
 * Ejemplo de URL generada:
 *   http://127.0.0.1:5174/?mode=new&productId=3&variantId=12&color=%236B7280&colorName=Azul&size=M&quantity=1
 */

export const EDITOR_BASE_URL = import.meta.env.VITE_EDITOR_3D_URL || 'http://127.0.0.1:5174/';

/** Hex por defecto usado cuando la variante no trae color_hex. */
export const COLOR_FALLBACK = '#6B7280';

/**
 * Construye la URL del editor 3D con los parámetros del producto/variante.
 * @param {object} p
 * @param {number|string} p.productId
 * @param {object} p.variant   Variante del producto (id, color, color_hex, size)
 * @param {number}  p.quantity
 * @param {string}  p.mode     'new' | 'view' | 'edit'
 */
export function buildEditorUrl({ productId, variant, quantity = 1, mode = 'new' }) {
  const qs = new URLSearchParams({ mode });
  if (productId != null) qs.set('productId', String(productId));
  if (variant?.id != null) qs.set('variantId', String(variant.id));
  if (variant) {
    if (variant.color_hex) qs.set('color', variant.color_hex);
    if (variant.color) qs.set('colorName', variant.color);
    if (variant.size) qs.set('size', variant.size);
  }
  qs.set('quantity', String(quantity));
  return `${EDITOR_BASE_URL}?${qs.toString()}`;
}

/** Abre el editor 3D en una pestaña nueva. Devuelve la ventana (o null). */
export function openEditor({ productId, variant, quantity = 1, mode = 'new' }) {
  const url = buildEditorUrl({ productId, variant, quantity, mode });
  return window.open(url, '_blank', 'noopener,noreferrer');
}