/**
 * Funciones auxiliares del editor 3D.
 *
 * Proporciona utilidades para:
 * - Capturar el canvas de Three.js como imagen (descarga local).
 * - Subir la captura a Cloudinary para almacenamiento en la nube.
 * - Enviar el diseño como pedido al backend Django (API REST).
 * - Crear un registro de modelo 3D en el microservicio Models3D.
 * - Leer archivos locales como Data URLs.
 * - Calcular colores de contraste para accesibilidad visual.
 *
 * Captura de imagen del diseño (canvas.toDataURL):
 * El canvas 3D de Three.js se captura mediante `canvas.toDataURL("image/png")`
 * que devuelve una representación en base64 de la imagen renderizada.
 * Para capturar con fondo transparente (útil para logos y texturas),
 * se activa la bandera `captureTransparent` en el store, lo que elimina
 * el fondo blanco de la escena (ver canvas/index.jsx línea 39).
 *
 * Comunicación con el backend Django:
 * - `sendCanvasToApi` → POST a `VITE_API_URL` (ej. /api/orders/)
 *   Envía la imagen en base64, color, texturas y metadatos como JSON.
 * - `createModel3D`   → POST a `VITE_MODELS3D_API_URL` (ej. /api/models3d/models/)
 *   Almacena la URL de Cloudinary como referencia del diseño comunitario.
 * - `uploadCanvasToCloudinary` → POST a Cloudinary Upload API (multipart/form-data)
 *
 * RF-025: Las capturas de imagen provienen del canvas 3D interactivo.
 * RF-026: Los datos de personalización (color, logo, fullTexture) se
 *         incluyen en el payload enviado al backend.
 * RF-027: Los diseños subidos a Cloudinary pueden compartirse como
 *         plantillas comunitarias desde el microservicio Models3D.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/orders/";
const MODELS3D_API_URL = import.meta.env.VITE_MODELS3D_API_URL ?? "http://127.0.0.1:8000/api/models3d/models/";
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_URL =
  import.meta.env.VITE_CLOUDINARY_URL ??
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

import state from "../store";

/** Espera un número determinado de frames de animación antes de continuar */
const waitForNextFrames = (frames = 2) =>
  new Promise((resolve) => {
    const step = () => {
      if (frames <= 1) return resolve();
      frames -= 1;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

/**
 * Descarga el contenido del canvas de Three.js como una imagen PNG.
 * Activa temporalmente `captureTransparent` para capturar sin fondo blanco.
 */
export const downloadCanvasToImage = async () => {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;

  state.captureTransparent = true;
  await waitForNextFrames(2);

  const dataURL = canvas.toDataURL("image/png");
  const link = document.createElement("a");

  link.href = dataURL;
  link.download = "canvas.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  state.captureTransparent = false;
};

/**
 * Captura el canvas y sube la imagen a Cloudinary.
 * Requiere las variables de entorno VITE_CLOUDINARY_CLOUD_NAME
 * y VITE_CLOUDINARY_UPLOAD_PRESET.
 * @param {Object} options - Opciones adicionales (folder, public_id)
 * @returns {Promise<Object>} Respuesta JSON de Cloudinary
 */
export const uploadCanvasToCloudinary = async (options = {}) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Falta configuración de Cloudinary. Define VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const canvas = document.querySelector("canvas");
  if (!canvas) {
    throw new Error("No se encontró el canvas para subir a Cloudinary.");
  }

  state.captureTransparent = true;
  await waitForNextFrames(2);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  state.captureTransparent = false;

  if (!blob) {
    throw new Error("No se pudo capturar el canvas como imagen.");
  }

  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  if (options.folder) {
    formData.append("folder", options.folder);
  }
  if (options.public_id) {
    formData.append("public_id", options.public_id);
  }

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al subir a Cloudinary: ${response.status} ${errorText}`);
  }

  return response.json();
};

/**
 * Envía el diseño actual como pedido al backend Django.
 * POST a VITE_API_URL (por defecto /api/orders/).
 * Incluye la imagen en base64, color, texturas y metadatos.
 * @param {Object} orderData - Datos del pedido (image, designColor, etc.)
 * @returns {Promise<Object>} Respuesta JSON del backend
 */
export const sendCanvasToApi = async (orderData = {}) => {
  let dataURL = orderData.image;
  if (!dataURL) {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      throw new Error("No se encontró el canvas para el pedido.");
    }

    state.captureTransparent = true;
    await waitForNextFrames(2);
    dataURL = canvas.toDataURL("image/png");
    state.captureTransparent = false;
  }

  const payload = {
    image: dataURL,
    imageUrl: orderData.imageUrl || null,
    cloudinaryPublicId: orderData.cloudinaryPublicId || null,
    status: "pending",
    designColor: orderData.designColor || "",
    logoTexture: orderData.logoTexture || null,
    fullTexture: orderData.fullTexture || null,
    logoScale: orderData.logoScale ?? null,
    notes: orderData.notes || "Pedido pendiente de verificación",
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al enviar pedido: ${response.status} ${errorText}`);
  }

  return response.json();
};

/**
 * Crea un registro de modelo 3D en el microservicio Models3D.
 * POST a VITE_MODELS3D_API_URL (por defecto /api/models3d/models/).
 * Almacena la URL de Cloudinary como referencia del diseño.
 * @param {Object} modelData - Datos del modelo (name, cloudinary_url, etc.)
 * @returns {Promise<Object>} Respuesta JSON del backend
 */
export const createModel3D = async (modelData = {}) => {
  const response = await fetch(MODELS3D_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(modelData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al crear modelo 3D: ${response.status} ${errorText}`);
  }

  return response.json();
};

/**
 * Lee un archivo local y devuelve su contenido como Data URL.
 * Útil para cargar imágenes de logo/textura desde el dispositivo.
 * @param {File} file - Archivo de imagen seleccionado por el usuario
 * @returns {Promise<string>} Data URL de la imagen
 */
export const reader = (file) =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsDataURL(file);
  });

/**
 * Calcula un color de texto contrastante (blanco o negro) basado
 * en el brillo del color de fondo (fórmula W3C de luminancia relativa).
 * @param {string} color - Color hexadecimal (ej. '#353934')
 * @returns {string} 'black' o 'white'
 */
export const getContrastingColor = (color) => {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "black" : "white";
};
