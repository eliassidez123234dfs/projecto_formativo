/**
 * editor3d.js  —  Utilidades para abrir el editor 3D (microservicio Tshirt3D)
 *
 * SEGURIDAD: Los datos sensibles (productId, variantId, quantity) se
 * almacenan en la SESIÓN del backend ANTES de abrir el editor y se validan
 * en el servidor contra la base de datos (producto activo/aprobado,
 * variante válida, stock). En la URL solo viajan parámetros de UI
 * (mode, color, colorName, size) que no afectan la lógica de negocio.
 *
 * El precio, el stock y la talla/color autorizados SIEMPRE los calcula el
 * backend a partir de la BD, nunca del cliente.
 *
 * Flujo:
 *   1. POST /api/editor-session/save/  → guarda datos sensibles en la sesión
 *   2. Abre el editor con solo parámetros de UI en la URL
 *   3. El editor llama GET /api/editor-session/ para recuperar los datos
 *
 * Si el guardado de sesión falla, NO se abre el editor: el usuario recibe
 * un error en lugar de un editor roto que no podría guardar el diseño.
 */

import { getAccessToken } from '../services/authService';
import { buildApiUrl } from '../services/api';

// ─── CONSTANTE: URL BASE DEL EDITOR ───
export const EDITOR_BASE_URL = import.meta.env.VITE_EDITOR_3D_URL || 'http://127.0.0.1:5174/';

/** Hex por defecto usado cuando la variante no trae color_hex. */
export const COLOR_FALLBACK = '#6B7280';

/**
 * Guarda los datos sensibles del editor en la sesión del backend.
 * Adjunta el JWT si existe para reforzar la autenticación (opcional:
 * el endpoint funciona con cookie de sesión, que comparte la pestaña
 * del editor por ser el mismo sitio).
 * @returns {Promise<object>} respuesta del backend si fue exitosa
 */
// ─── FUNCIÓN: GUARDAR SESIÓN DEL EDITOR EN BACKEND ───
// Almacena productId, variantId y quantity en la sesión del servidor.
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
 * Construye la URL del editor 3D SOLO con parámetros de UI (no sensibles).
 * Los datos sensibles se recuperan del backend vía sesión.
 */
// ─── FUNCIÓN: CONSTRUIR URL DEL EDITOR ───
// Solo incluye parámetros de UI (color, talla, modo), nunca datos sensibles.
export function buildEditorUrl({ variant, mode = 'new', sessionToken }) {
  const qs = new URLSearchParams({ mode });
  if (sessionToken) qs.set('sessionToken', sessionToken);
  if (variant) {
    if (variant.color_hex) qs.set('color', variant.color_hex);
    if (variant.color) qs.set('colorName', variant.color);
    if (variant.size) qs.set('size', variant.size);
  }
  return `${EDITOR_BASE_URL}?${qs.toString()}`;
}

/**
 * Abre el editor 3D en una pestaña nueva.
 * 1. Guarda los datos sensibles en la sesión del backend (validados).
 * 2. Si el guardado falla → lanza error (el caller muestra el toast).
 * 3. Abre el editor con solo parámetros de UI en la URL.
 *
 * @throws {Error} si la sesión no se pudo guardar o validar.
 */
// ─── FUNCIÓN PÚBLICA: ABRIR EDITOR 3D ───
// Guarda sesión en backend → construye URL → abre pestaña nueva.
export async function openEditor({ productId, variant, quantity = 1, mode = 'new' }) {
  const session = await saveEditorSession({ productId, variant, quantity });
  const url = buildEditorUrl({ variant, mode, sessionToken: session.sessionToken });
  return window.open(url, '_blank', 'noopener,noreferrer');
}