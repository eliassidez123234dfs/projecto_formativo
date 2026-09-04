const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/orders/";
const MODELS3D_API_URL = import.meta.env.VITE_MODELS3D_API_URL ?? "http://127.0.0.1:8000/api/models3d/models/";
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_URL =
  import.meta.env.VITE_CLOUDINARY_URL ??
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

import state from "../store";

const waitForNextFrames = (frames = 2) =>
  new Promise((resolve) => {
    const step = () => {
      if (frames <= 1) return resolve();
      frames -= 1;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

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

export const reader = (file) =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsDataURL(file);
  });

export const getContrastingColor = (color) => {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "black" : "white";
};
