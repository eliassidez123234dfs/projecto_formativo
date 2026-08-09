/**
 * api.js  —  Cliente HTTP centralizado
 * ─────────────────────────────────────────────────────────────────────────
 * Define tres clientes Axios con diferentes estrategias de autenticación
 * y exporta todas las funciones de llamada a la API REST del backend.
 *
 * ─── CLIENTES ───
 * 1. api         →  Autenticado con JWT (access token en memoria +
 *                   refresh automático en 401). Usa withCredentials.
 * 2. publicApi   →  Sin autenticación. Para catálogo, productos y
 *                   contenido público.
 * 3. sessionApi  →  Basado en cookies de sesión. Para operaciones de
 *                   carrito anónimo y checkout.
 *
 * ─── INTERCEPTOR DE RESPUESTA (api) ───
 * Cuando el backend responde 401, el interceptor:
 * 1. Verifica si ya hay un refresh en curso (cola de espera).
 * 2. Si no, intenta renovar el token con /token/refresh/.
 * 3. Si el refresh falla → redirige a /login.
 * 4. Si el refresh funciona → reintenta la petición original y
 *    resuelve todas las peticiones encoladas.
 *
 * Este patrón evita que múltiples peticiones fallen simultáneamente
 * por expiración del token y previene llamadas de refresh duplicadas.
 */
import axios from 'axios';
import { logClientError } from '../utils/logger';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/';
export const buildApiUrl = (endpoint) => `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

function logHttpError(error) {
  const status = error?.response?.status;
  if (status && status !== 401) {
    logClientError({
      name: 'HTTP',
      message: error?.message || 'Error de red',
      response: { status },
      config: { url: error?.config?.url },
    });
  }
}

let isRefreshing = false;
let failedQueue = [];
let refreshSubscribers = [];

function onTokenRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

function redirectLogin() {
  clearAuth();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Cliente autenticado con JWT.
 * Incluye automáticamente el access token en cada petición
 * y maneja la renovación silenciosa del token cuando expira.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * Cliente público (sin autenticación).
 * Se usa para consultas que no requieren sesión:
 * catálogo, detalle de productos, reseñas públicas.
 */
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

/**
 * Cliente de sesión (cookies).
 * Se usa para operaciones de carrito anónimo y checkout,
 * donde la identificación se mantiene mediante cookies de sesión
 * en lugar de tokens JWT.
 */
const sessionApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Adjunta el JWT access token a cada petición saliente del cliente api
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Interceptor de respuesta para el cliente api.
 * Atrapa errores 401 e intenta renovar el token automáticamente
 * antes de reintentar la petición original.
 */
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Si ya hay un refresh en curso, encola esta petición
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        redirectLogin();
        return Promise.reject(error);
      }
      try {
        const response = await axios.post(
          `${API_BASE_URL.replace(/\/+$/, '')}/token/refresh/`,
          { refresh: refreshToken }
        );
        const newToken = response.data.access;
        setTokens(newToken, response.data.refresh || refreshToken, getCurrentUser());
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        onTokenRefreshed(newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        redirectLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    logHttpError(error);
    return Promise.reject(error);
  }
);

publicApi.interceptors.response.use(
  response => response,
  error => {
    logHttpError(error);
    return Promise.reject(error);
  }
);

sessionApi.interceptors.response.use(
  response => response,
  error => {
    logHttpError(error);
    return Promise.reject(error);
  }
);

// ─────────── USUARIOS (cuenta propia) ───────────
export const updateMyProfile = async (data) => {
  const response = await api.patch('usuarios/actualizar_perfil/', data);
  return response.data;
};

export const changeMyPassword = async (data) => {
  const response = await api.post('usuarios/cambiar_password/', data);
  return response.data;
};

// ─────────── CATALOG ───────────
/** Obtiene el catálogo paginado de productos con filtros opcionales. */
export const fetchCatalog = async (params = {}) => {
  const response = await publicApi.get('catalog/', { params });
  return response.data;
};

/** Obtiene las opciones de filtro del catálogo (categorías, rangos de precio). */
export const fetchCatalogFilters = async () => {
  const response = await api.get('catalog/filters/');
  return response.data;
};

/** Obtiene productos destacados/promocionados para la página de inicio. */
export const fetchFeaturedProducts = async () => {
  const response = await api.get('catalog/featured/');
  return response.data;
};

/** Obtiene productos que pertenecen a una categoría específica. */
export const fetchCategoryProducts = async (categoryId, params = {}) => {
  return fetchCatalog({ ...params, category: categoryId });
};

// ─────────── PRODUCTS ───────────
/** Obtiene el detalle completo del producto, incluyendo variantes e imágenes. */
export const fetchProductDetail = async (productId) => {
  const response = await publicApi.get(`products/${productId}/`);
  return response.data;
};

// ─────────── CHECKOUT (sesión) ───────────
export const getCheckoutSummary = async () => {
  const response = await sessionApi.get('checkout/summary/');
  return response.data;
};

export const confirmCheckout = async (data) => {
  const response = await sessionApi.post('checkout/confirm/', data);
  return response.data;
};

// ─────────── PRODUCTS (gestión admin, con token) ───────────
export const fetchProducts = async (params = {}) => {
  const response = await api.get('products/', { params });
  return response.data;
};

export const fetchProductAdmin = async (id) => {
  const response = await api.get(`products/${id}/`);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await api.post('products/', data);
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await api.patch(`products/${id}/`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  await api.delete(`products/${id}/`);
};

export const fetchProductChecklist = async (id) => {
  const response = await api.get(`products/${id}/checklist/`);
  return response.data;
};

export const publishProduct = async (id) => {
  const response = await api.post(`products/${id}/publish/`);
  return response.data;
};

export const disapproveProduct = async (id, data = {}) => {
  const response = await api.post(`products/${id}/disapprove/`, data);
  return response.data;
};

export const toggleProductActive = async (id) => {
  const response = await api.patch(`products/${id}/toggle-active/`);
  return response.data;
};

export const fetchProductAudits = async (id) => {
  const response = await api.get(`products/${id}/audits/`);
  return response.data;
};

// ─────────── IMÁGENES de producto (admin) ───────────
export const createProductImage = async (id, formData) => {
  const response = await api.post(`products/${id}/images/`, formData);
  return response.data;
};

export const updateProductImage = async (productId, imageId, data) => {
  const response = await api.patch(`products/${productId}/images/${imageId}/`, data);
  return response.data;
};

export const deleteProductImage = async (productId, imageId) => {
  await api.delete(`products/${productId}/images/${imageId}/`);
};

export const reorderProductImages = async (id, items) => {
  const response = await api.patch(`products/${id}/images/reorder/`, { items });
  return response.data;
};

// ─────────── VARIANTES de producto (admin) ───────────
export const createProductVariant = async (productId, data) => {
  const response = await api.post(`products/${productId}/variants/`, data);
  return response.data;
};

export const updateProductVariant = async (productId, variantId, data) => {
  const response = await api.patch(`products/${productId}/variants/${variantId}/`, data);
  return response.data;
};

export const deleteProductVariant = async (productId, variantId) => {
  await api.delete(`products/${productId}/variants/${variantId}/`);
};

// ─────────── CART (usa sesión, NO JWT) ───────────
export const fetchCart = async () => {
  try {
    const response = await cartClient().get('cart/');
    return response.data;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return { items: [], total_items: 0, total_amount: '0.00' };
    }
    throw err;
  }
};

/** Agrega una variante de producto al carrito. */
export const addToCart = async (productId, variantId, quantity = 1) => {
  const response = await cartClient().post('cart/add/', {
    product_id: productId,
    variant_id: variantId,
    quantity,
  });
  return response.data;
};

/** Actualiza la cantidad de un ítem en el carrito. */
export const updateCartItemQuantity = async (itemId, quantity) => {
  const response = await cartClient().patch(`cart/items/${itemId}/quantity/`, { quantity });
  return response.data;
};

/** Elimina un ítem específico del carrito. */
export const removeCartItem = async (itemId) => {
  await cartClient().delete(`cart/items/${itemId}/remove/`);
};

/** Vacía el carrito por completo. */
export const clearCart = async () => {
  await cartClient().delete('cart/clear/');
};

// ─────────── ADMIN ───────────
/** Obtiene estadísticas agregadas para el panel de administración. */
export const fetchAdminStats = async () => {
  const response = await api.get('admin/stats/');
  return response.data;
};

/** Obtiene la lista paginada de todos los carritos (admin). */
export const fetchAdminCarts = async (page = 1, pageSize = 20) => {
  const response = await api.get('admin/carts/', { params: { page, page_size: pageSize } });
  return response.data;
};

/** Obtiene el detalle de un carrito por su ID (admin). */
export const fetchAdminCartDetail = async (id) => {
  const response = await api.get(`admin/carts/${id}/`);
  return response.data;
};

/** Actualiza el estado de un carrito (admin). */
export const updateCartStatus = async (cartId, status) => {
  const response = await api.patch(`admin/carts/${cartId}/status/`, { status });
  return response.data;
};

/** Obtiene la lista paginada de usuarios (admin). */
export const fetchAdminUsers = async (params = {}) => {
  const response = await api.get('admin/usuarios/', { params });
  return response.data;
};

/** Crea un nuevo usuario desde el panel de administración. */
export const createAdminUser = async (data) => {
  const response = await api.post('admin/usuarios/', data);
  return response.data;
};

/** Actualiza los datos de un usuario desde el panel de administración. */
export const updateAdminUser = async (id, data) => {
  const response = await api.patch(`admin/usuarios/${id}/`, data);
  return response.data;
};

/** Ejecuta una acción administrativa sobre un usuario (bloquear, activar, etc.). */
export const adminUserAction = async (userId, action, payload = {}) => {
  const response = await api.post(`admin/usuarios/${userId}/${action}/`, payload);
  return response.data;
};

export const fetchContactMessages = async (page = 1, pageSize = 20) => {
  const response = await api.get('contacto/', { params: { page, page_size: pageSize } });
  return response.data;
};

/** Marca un mensaje de contacto como leído (admin). */
export const markContactRead = async (id) => {
  const response = await api.post(`contacto/${id}/marcar_leido/`);
  return response.data;
};

/** Elimina un mensaje de contacto (admin). */
export const deleteContactMessage = async (id) => {
  await api.delete(`contacto/${id}/eliminar/`);
};

export const fetchAuditLogs = async (page = 1, pageSize = 20, filters = {}) => {
  const response = await api.get('admin/usuarios/auditoria/', { params: { page, page_size: pageSize, ...filters } });
  return response.data;
};

export const fetchAdminOrders = async (page = 1, pageSize = 20, filters = {}) => {
  const response = await api.get('admin/orders/', { params: { page, page_size: pageSize, ...filters } });
  return response.data;
};

export const fetchAdminOrderDetail = async (id) => {
  const response = await api.get(`admin/orders/${id}/`);
  return response.data;
};

// ─────────── ADMIN ORDERS ───────────
/** Actualiza el estado de un pedido (admin). */
export const updateOrderStatus = async (id, status) => {
  const response = await api.patch(`admin/orders/${id}/status/`, { status });
  return response.data;
};

/** Reintenta el procesamiento de un pedido fallido (admin). */
export const reprocessOrder = async (id) => {
  const response = await api.post(`admin/orders/${id}/reprocess/`);
  return response.data;
};

// ─────────── CHECKOUT / PAYMENT ───────────
/** Obtiene un resumen del carrito actual para la página de checkout. */
export const fetchCheckoutSummary = async () => {
  const response = await sessionApi.get('checkout/summary/');
  return response.data;
};

/** Inicia el proceso de checkout con datos de envío y retorna una orden. */
export const initCheckout = async (shippingData) => {
  const response = await sessionApi.post('checkout/init/', shippingData);
  return response.data;
};

/** Crea una sesión de pago para una orden (Wompi). */
export const createPayment = async (orderId) => {
  const response = await sessionApi.post('checkout/create-payment/', { order_id: orderId });
  return response.data;
};

/** Consulta el estado del pago por su referencia de pasarela. */
export const fetchPaymentStatus = async (reference) => {
  const response = await sessionApi.get('checkout/payment-status/', { params: { reference } });
  return response.data;
};

// ─────────── REVIEWS ───────────
/** Obtiene todas las reseñas de un producto. */
export const fetchProductReviews = async (productId) => {
  const response = await publicApi.get('products/reviews/', { params: { product: productId } });
  return response.data;
};

/** Crea una nueva reseña de producto (solo usuarios autenticados). */
export const createReview = async (productId, rating, comment) => {
  const response = await api.post('products/reviews/', { product: productId, rating, comment });
  return response.data;
};

/** Actualiza una reseña de producto existente. */
export const updateReview = async (reviewId, rating, comment) => {
  const response = await api.patch(`products/reviews/${reviewId}/`, { rating, comment });
  return response.data;
};

// ─────────── INVOICES ───────────
/** Genera una factura para una orden completada. */
export const generateInvoice = async (orderId) => {
  const response = await api.post('orders/invoices/generate/', { order_id: orderId });
  return response.data;
};

/** Obtiene una factura específica por su ID. */
export const fetchInvoice = async (invoiceId) => {
  const response = await api.get(`orders/invoices/${invoiceId}/`);
  return response.data;
};

/** Obtiene la factura asociada a una orden específica. */
export const fetchOrderInvoice = async (orderId) => {
  const response = await api.get('orders/invoices/', { params: { order: orderId } });
  return response.data;
};

// ─────────── CATEGORIES (Catalog app) ───────────
/** Obtiene todas las categorías del catálogo. */
export const fetchCategories = async () => {
  const response = await publicApi.get('catalog/categories/');
  return response.data;
};

/** Crea una nueva categoría (admin). */
export const createCategory = async (data) => {
  const response = await api.post('catalog/categories/', data);
  return response.data;
};

/** Actualiza una categoría (admin). */
export const updateCategory = async (id, data) => {
  const response = await api.patch(`catalog/categories/${id}/`, data);
  return response.data;
};

/** Elimina una categoría (admin). */
export const deleteCategory = async (id) => {
  await api.delete(`catalog/categories/${id}/`);
};

// ─────────── 3D MODELS (models3d app) ───────────
/** Obtiene todos los modelos 3D. */
export const fetchModels3D = async (params = {}) => {
  const response = await publicApi.get('models3d/models/', { params });
  return response.data;
};

/** Crea un modelo 3D (admin). */
export const createModel3D = async (data) => {
  const response = await api.post('models3d/models/', data);
  return response.data;
};

/** Actualiza un modelo 3D (admin). */
export const updateModel3D = async (id, data) => {
  const response = await api.patch(`models3d/models/${id}/`, data);
  return response.data;
};

/** Elimina un modelo 3D (admin). */
export const deleteModel3D = async (id) => {
  await api.delete(`models3d/models/${id}/`);
};

// ─────────── SAVED DESIGNS (MongoDB, user designs) ───────────
/** Obtiene diseños guardados del usuario actual o de todos (admin). */
export const fetchDesigns = async (params = {}) => {
  const response = await api.get('designs/', { params });
  return response.data;
};

/** Obtiene un diseño guardado por ID. */
export const fetchDesignDetail = async (id) => {
  const response = await api.get(`designs/${id}/`);
  return response.data;
};

/** Crea un nuevo diseño guardado. */
export const createDesign = async (data) => {
  const response = await api.post('designs/', data);
  return response.data;
};

/** Actualiza un diseño guardado. */
export const updateDesign = async (id, data) => {
  const response = await api.patch(`designs/${id}/`, data);
  return response.data;
};

/** Elimina un diseño guardado. */
export const deleteDesign = async (id) => {
  await api.delete(`designs/${id}/`);
};

// ─────────── PRODUCT IMAGES (Cloudinary) ───────────
/** Obtiene todas las imágenes de productos. */
export const fetchProductImages = async (params = {}) => {
  const response = await api.get('products/images/', { params });
  return response.data;
};

/** Elimina una imagen de producto por su ID directo. */
export const deleteProductImageById = async (id) => {
  await api.delete(`products/images/${id}/`);
};
