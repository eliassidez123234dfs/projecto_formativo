import { proxy } from 'valtio';

const getParam = (key) => new URLSearchParams(window.location.search).get(key);

const isValidHex = (hex) => /^#[0-9a-fA-F]{6}$/.test(hex || '');

const colorParam = getParam('color');
const quantityParam = Number.parseInt(getParam('quantity') || '1', 10);

const state = proxy({
  intro: false,
  captureTransparent: false,
  color: isValidHex(colorParam) ? colorParam : '#353934',
  isLogoTexture: true,
  isFullTexture: false,
  logoDecal: './superman_logo1.png',
  fullDecal: './circuit.png',
  logoPosition: [0, 0.04, 0.15],
  logoScale: 0.15,
  // ── Parámetros del producto/variante (desde la URL del editor) ──
  mode: getParam('mode') || 'new',
  productId: getParam('productId') || null,
  variantId: getParam('variantId') || null,
  colorName: getParam('colorName') || '',
  size: getParam('size') || '',
  quantity: Number.isFinite(quantityParam) && quantityParam > 0 ? quantityParam : 1,
  // ── Autenticación ──
  isAdmin: getParam('isAdmin') === 'true',
  userRole: getParam('userRole') || 'Usuario',
});

export default state;