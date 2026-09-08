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
  mode: new URLSearchParams(window.location.search).get('mode') || 'new',
  colorName: '',
  size: '',
  productId: null,
  productName: '',
  variantId: null,
  quantity: 1,
  sessionToken: null,
  sessionLoaded: false,
  sessionError: false,
});

/**
 * Carga los datos sensibles del editor desde la BD usando el token temporal.
 * El token se pasa por URL: /editor/?session_token=xxx
 */
export async function loadEditorSession() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('session_token');

  if (!token) {
    state.sessionLoaded = true;
    state.sessionError = true;
    return;
  }

  state.sessionToken = token;

  const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || (
    import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : '/api'
  );

  try {
    const resp = await fetch(
      `${BACKEND_API_URL.replace(/\/+$/, '')}/editor-session/?token=${encodeURIComponent(token)}`,
      { credentials: 'include' }
    );
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
