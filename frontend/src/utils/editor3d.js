/**
 * editor3d.js  —  Utilidades para abrir el editor 3D (microservicio Tshirt3D)
 *
 * SEGURIDAD: Los datos sensibles (productId, variantId, quantity) se
 * almacenan en la BD con un token temporal ANTES de abrir el editor.
 * El token expira en 60 minutos y es de una sola vez.
 *
 * Flujo:
 *   1. POST /api/editor-session/save/  → guarda datos en BD, retorna token
 *   2. Abre el editor con el token en la URL: /editor/?session_token=xxx
 *   3. El editor llama GET /api/editor-session/?token=xxx para recuperar datos
 *   4. El editor llama POST /api/editor-session/commit/?token=xxx para agregar al carrito
 */

import { getAccessToken } from '../services/authService';
import { buildApiUrl } from '../services/api';

export const EDITOR_BASE_URL = import.meta.env.VITE_TSHIRT3D_URL || (
  import.meta.env.DEV ? 'http://127.0.0.1:5174/' : '/editor/'
);

/** Hex por defecto usado cuando la variante no trae color_hex. */
export const COLOR_FALLBACK = '#6B7280';

/**
 * Guarda los datos sensibles del editor en la BD y retorna un token temporal.
 */
async function saveEditorSession({ productId, variant, quantity }) {
  const headers = { 'Content-Type': 'application/json' };
  const accessToken = getAccessToken();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(buildApiUrl('editor-session/save/'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      productId,
      variantId: variant?.id,
      quantity,
    }),
  });

  if (!response.ok) {
    let detail = 'Error al guardar la sesión del editor.';
    try {
      const body = await response.json();
      detail = body?.error || detail;
    } catch {
      /* mantener mensaje genérico */
    }
    throw new Error(detail);
  }
  return response.json();
}

/**
 * Construye la URL del editor 3D con el token y parámetros de UI.
 */
export function buildEditorUrl({ token, variant, mode = 'new' }) {
  const qs = new URLSearchParams({ session_token: token });
  if (variant) {
    if (variant.color_hex) qs.set('color', variant.color_hex);
    if (variant.color) qs.set('colorName', variant.color);
    if (variant.size) qs.set('size', variant.size);
  }
  return `${EDITOR_BASE_URL}?${qs.toString()}`;
}

/**
 * Abre el editor 3D en una pestaña nueva.
 * 1. Guarda los datos sensibles en la BD (validados).
 * 2. Si el guardado falla → lanza error (el caller muestra el toast).
 * 3. Abre el editor con el token en la URL.
 */
export async function openEditor({ productId, variant, quantity = 1, mode = 'new' }) {
  const result = await saveEditorSession({ productId, variant, quantity });
  const url = buildEditorUrl({ token: result.token, variant, mode });
  return window.open(url, '_blank', 'noopener,noreferrer');
}
