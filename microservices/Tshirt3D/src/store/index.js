/**
 * Store global del editor 3D using Valtio.
 *
 * Valtio es una librería de estado reactivo basada en proxies de JS.
 * Al mutar directamente las propiedades de `state`, los componentes
 * que usen useSnapshot(state) se re-renderizan automáticamente.
 *
 * Este store centraliza:
 * - Configuración visual de la camiseta (color, texturas, posición del logo)
 * - Estado de rotación 360° del modelo 3D
 * - Datos de personalización con texto
 * - Datos de sesión cargados desde el backend Django
 */
import { proxy } from 'valtio';

// ── Utilidades de validación ──
const isValidHex = (hex) => /^#[0-9a-fA-F]{6}$/.test(hex || '');

// ── Estado reactivo global del editor ──
const state = proxy({
  // ── Configuración inicial de la UI ──
  intro: false,              // Controla la pantalla de introducción
  captureTransparent: false, // Activa fondo transparente para capturas PNG
  color: '#353934',          // Color actual de la camiseta (hex)

  // ── Modo de textura: logo vs textura completa ──
  isLogoTexture: true,       // Muestra la calcomanía del logo
  isFullTexture: false,      // Muestra la textura de cuerpo completo
  logoDecal: './superman_logo1.png',  // Ruta/URL de la imagen del logo
  fullDecal: './circuit.png',         // Ruta/URL de la textura completa
  logoPosition: [0, 0.04, 0.15],     // Posición [x, y, z] del logo en 3D
  logoScale: 0.15,                    // Escala del logo (0.05 - 0.5)

  // ── Rotación 360° de la camisa ──
  // Se controla desde CameraRig.jsx usando useFrame + easing.damp
  shirtRotationY: 0,         // Ángulo actual de rotación (radianes)
  targetRotationY: 0,        // Ángulo objetivo hacia el que se interpola
  autoRotate: false,         // Giro automático continuo
  isCapturing: false,        // Bloquea interacciones durante captura de imagen

  // ── Personalización con Texto en 3D ──
  isTextTexture: false,      // Activa/desactiva la capa de texto
  customText: '',            // Texto ingresado por el usuario (máx 40 chars)
  textColor: '#ffffff',      // Color del texto (hex)
  textFont: 'Arial',         // Tipografía seleccionada
  textScale: 0.18,           // Escala del texto en 3D (0.05 - 0.5)
  textPosition: [0, -0.04, 0.15], // Posición [x, y, z] del texto en 3D

  // ── Datos de sesión (cargados desde el backend Django) ──
  // Solo mode es parámetro de URL; el resto se obtiene del backend
  mode: new URLSearchParams(window.location.search).get('mode') || 'new',
  colorName: '',             // Nombre legible del color (ej: "Negro")
  size: '',                  // Talla seleccionada (S, M, L, XL, etc.)
  productId: null,           // ID del producto en Django (validado por backend)
  productName: '',           // Nombre del producto
  variantId: null,           // ID de la variante específica
  quantity: 1,               // Cantidad (validada por backend contra stock)
  sessionLoaded: false,      // Indica si la sesión se cargó correctamente
  sessionError: false,       // Indica si hubo error al cargar la sesión
  sessionToken: '',          // Token firmado para el handoff entre pestañas
});

/**
 * Carga los datos sensibles del editor desde la sesión del backend.
 * Se llama una vez al montar la app. Los valores devueltos ya fueron
 * validados por el servidor (producto activo/aprobado, variante válida,
 * cantidad acotada por stock). El editor NUNCA confía en la URL para
 * estos datos.
 */
export async function loadEditorSession() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';
  try {
    const sessionToken = new URLSearchParams(window.location.search).get('sessionToken') || '';
    const tokenQuery = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
    const resp = await fetch(`${API_URL.replace(/\/+$/, '')}/editor-session/${tokenQuery}`, {
      credentials: 'include',
    });
    if (!resp.ok) throw new Error('No session');
    const data = await resp.json();
    state.productId = data.productId || null;
    state.productName = data.productName || '';
    state.variantId = data.variantId || null;
    state.sessionToken = sessionToken;
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
