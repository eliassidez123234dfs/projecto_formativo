/**
 * Funciones auxiliares para el microservicio Tshirt3D.
 *
 * Agrupa toda la lógica de:
 * - Captura de imagen del canvas Three.js (canvas.toDataURL / canvas.toBlob)
 * - Subida a Cloudinary (almacenamiento externo de imágenes)
 * - Envío de pedidos al backend Django (API REST)
 * - Creación de modelos 3D comunitarios (RF-027)
 * - Agregado al carrito de compras
 * - Utilidades de contraste de color y lectura de archivos
 *
 * Flujo de captura de imagen:
 * 1. Se busca el elemento <canvas> del DOM (renderizado por Three.js)
 * 2. Se activa captureTransparent para fondo transparente
 * 3. Se esperan 2-4 frames con requestAnimationFrame para que el
 *    renderizado se complete antes de capturar
 * 4. Se usa toDataURL("image/png") o toBlob() para obtener la imagen
 *
 * Nota: preserveDrawingBuffer: true en el Canvas de Three.js es
 * requerido para que toDataURL funcione correctamente.
 */
const API_URL = import.meta.env.VITE_API_URL ?? (
  import.meta.env.DEV ? "http://127.0.0.1:8000/api/orders/" : "/api/orders/"
);
const MODELS3D_API_URL = import.meta.env.VITE_MODELS3D_API_URL ?? (
  import.meta.env.DEV ? "http://127.0.0.1:8000/api/models3d/models/" : "/api/models3d/models/"
);
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_URL =
  import.meta.env.VITE_CLOUDINARY_URL ??
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

import state from "../store";

// ── Utilidades de cookies y sincronización de frames ──

/** Lee una cookie por nombre (usado para CSRF al agregar al carrito). */
const getCookie = (name) => {
  const cookies = `; ${document.cookie}`;
  const parts = cookies.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift() || null;
  return null;
};

const waitForNextFrames = (frames = 2) =>
  new Promise((resolve) => {
    const step = () => {
      if (frames <= 1) return resolve();
      frames -= 1;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

// ── Captura de imagen del canvas Three.js ──

/** Descarga el diseño actual como archivo PNG al disco del usuario. */
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

/** Captura una vista individual del modelo en el ángulo especificado. */
const captureSingleView = async (canvas, rotationY = 0) => {
  state.isCapturing = true;
  state.captureTransparent = true;
  state.shirtRotationY = rotationY;
  state.targetRotationY = rotationY;
  await waitForNextFrames(4);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob;
};

/**
 * Captura vistas frontal (0°) y posterior (180°) del modelo 3D.
 * Restaura la rotación y configuración original después de la captura.
 */
export const captureShirtDualViews = async () => {
  const canvas = document.querySelector("canvas");
  if (!canvas) {
    throw new Error("No se encontró el canvas para capturar las vistas.");
  }

  const prevRotationY = state.shirtRotationY;
  const prevTargetY = state.targetRotationY;
  const prevAutoRotate = state.autoRotate;
  state.autoRotate = false;

  try {
    // 1. Captura Frente (0 radianes)
    const frontBlob = await captureSingleView(canvas, 0);

    // 2. Captura Atrás (PI radianes / 180 grados)
    const backBlob = await captureSingleView(canvas, Math.PI);

    return { frontBlob, backBlob };
  } finally {
    state.isCapturing = false;
    state.captureTransparent = false;
    state.shirtRotationY = prevRotationY;
    state.targetRotationY = prevTargetY;
    state.autoRotate = prevAutoRotate;
  }
};

// ── Subida a Cloudinary ──

/**
 * Sube las vistas frontal y posterior del diseño a Cloudinary.
 * Retorna URLs seguras para usar en el pedido y en la previsualización.
 */
export const uploadCanvasToCloudinary = async (options = {}) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Falta configuración de Cloudinary. Define VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const { frontBlob, backBlob } = await captureShirtDualViews();

  if (!frontBlob || !backBlob) {
    throw new Error("No se pudo capturar el frente o reverso del diseño.");
  }

  const uploadBlob = async (blob, suffix = "front") => {
    const formData = new FormData();
    formData.append("file", blob);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    if (options.folder) {
      formData.append("folder", options.folder);
    }
    if (options.public_id) {
      formData.append("public_id", `${options.public_id}_${suffix}`);
    }

    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al subir a Cloudinary (${suffix}): ${response.status} ${errorText}`);
    }

    return response.json();
  };

  const [frontResult, backResult] = await Promise.all([
    uploadBlob(frontBlob, "front"),
    uploadBlob(backBlob, "back"),
  ]);

  return {
    front: frontResult,
    back: backResult,
    secure_url: frontResult.secure_url || frontResult.url || "",
    front_url: frontResult.secure_url || frontResult.url || "",
    back_url: backResult.secure_url || backResult.url || "",
    public_id: frontResult.public_id || "",
    bytes: (frontResult.bytes || 0) + (backResult.bytes || 0),
  };
};

// ── Comunicación con el backend Django (API REST) ──

/**
 * Envía el diseño capturado como pedido al backend Django.
 * POST a /api/orders/ con image (base64), diseño, notas, etc.
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
 * Crea un modelo 3D comunitario en el microservicio Models3D (RF-027).
 * POST a /api/models3d/models/ con los datos del diseño.
 */
export const createModel3D = async (modelData = {}) => {
  const response = await fetch(MODELS3D_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // comparte la cookie de sesión (2008: anónimo carrito)
    body: JSON.stringify(modelData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al crear modelo 3D: ${response.status} ${errorText}`);
  }

  return response.json();
};

// ── Gestión del carrito de compras ──

/**
 * Agrega el diseño al carrito usando la sesión validada del backend.
 * POST a /api/editor-session/commit/ con CSRF token y cookies de sesión.
 * El backend valida stock, producto activo y variante antes de agregar.
 */
export const addDesignToCart = async (design = {}) => {
  const headers = { "Content-Type": "application/json" };
  const csrfToken = getCookie("csrftoken");
  if (csrfToken) headers["X-CSRFToken"] = csrfToken;

  const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "/api")).replace(/\/+$/, "");
  const response = await fetch(`${API_BASE}/editor-session/commit/`, {
    method: "POST",
    headers,
    credentials: "include", // importante: la sesión del carrito vive en cookies
    body: JSON.stringify({
      sessionToken: state.sessionToken || null,
      designPreviewUrl: design.designPreviewUrl || null,
      designData: design.designData || {},
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail =
        body?.quantity?.[0] ||
        body?.product_id?.[0] ||
        body?.variant_id?.[0] ||
        body?.error ||
        body?.detail ||
        JSON.stringify(body);
    } catch {
      detail = await response.text();
    }
    throw new Error(`No se pudo agregar al carrito: ${detail}`);
  }

  return response.json();
};

// ── Utilidades de archivos y contraste de color ──

/** Convierte un archivo File a Data URL (base64) usando FileReader API. */
export const reader = (file) =>
  new Promise((resolve) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.onerror = () => resolve(null);
    fileReader.readAsDataURL(file);
  });

/**
 * Calcula el color de texto contrastante (negro o blanco) según la
 * luminancia relativa del color de fondo (fórmula W3C).
 * Asegura legibilidad del texto sobre cualquier color de camiseta.
 */
export const getContrastingColor = (color) => {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "black" : "white";
};
