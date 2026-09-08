import { proxy } from 'valtio';

const isValidHex = (hex) => /^#[0-9a-fA-F]{6}$/.test(hex || '');

const state = proxy({
  intro: false,
  captureTransparent: false,
  color: '#353934',
  isLogoTexture: true,
  isFullTexture: false,
  logoDecal: './superman_logo1.png',
  fullDecal: './circuit.png',
  logoPosition: [0, 0.04, 0.15],
  logoScale: 0.15,
  // Solo el modo de apertura es una preferencia de UI no sensible.
  mode: new URLSearchParams(window.location.search).get('mode') || 'new',
  colorName: '',
  size: '',
  // ── Datos sensibles (cargados desde la sesión del backend) ──
  productId: null,
  productName: '',
  variantId: null,
  quantity: 1,
  sessionLoaded: false,
  sessionError: false,
});

/**
 * Carga los datos sensibles del editor desde la sesión del backend.
 * Se llama una vez al montar la app. Los valores devueltos ya fueron
 * validados por el servidor (producto activo/aprobado, variante válida,
 * cantidad acotada por stock). El editor NUNCA confía en la URL para
 * estos datos.
 */
export async function loadEditorSession() {
  const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || (
    import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : '/api'
  );
  try {
    const resp = await fetch(`${BACKEND_API_URL.replace(/\/+$/, '')}/editor-session/`, {
      credentials: 'include',
    });
    if (!resp.ok) throw new Error('No session');
    const data = await resp.json();
    state.productId = data.productId || null;
    state.productName = data.productName || '';
    state.variantId = data.variantId || null;
    state.quantity = Number.isFinite(Number(data.quantity)) && Number(data.quantity) > 0 ? Number(data.quantity) : 1;
    state.color = isValidHex(data.colorHex) ? data.colorHex : '#353934';
    state.colorName = data.color || '';
    state.size = data.size || '';
    state.sessionLoaded = true;
    state.sessionError = false;
  } catch {
    state.sessionLoaded = true;
    state.sessionError = true;
  }
}

export default state;
