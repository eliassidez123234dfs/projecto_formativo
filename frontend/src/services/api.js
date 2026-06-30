import axios from 'axios';
import { getAccessToken, clearAuth, getStoredRefreshToken, setTokens, getCurrentUser } from './authService';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/';
export const buildApiUrl = (endpoint) => `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

// Token refresh queue — prevents multiple simultaneous refresh calls
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

// Authenticated API client — auto-attaches JWT and handles 401 refresh
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Public client — no auth headers (catalog, products)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

// Session client — uses cookies for anonymous cart operations
const sessionApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Attach JWT access token to every authenticated request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 responses and attempt silent token refresh before retrying
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If a refresh is already in-flight, queue this request
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
    return Promise.reject(error);
  }
);

// ─────────── AUTH ───────────
/** Fetch the currently authenticated user's profile. Returns null on failure. */
export const fetchCurrentUser = async () => {
  try {
    const response = await api.get('usuarios/perfil/');
    return response.data;
  } catch {
    return null;
  }
};

// ─────────── CATALOG ───────────
/** Fetch paginated catalog products with optional filter params. */
export const fetchCatalog = async (params = {}) => {
  const response = await publicApi.get('catalog/', { params });
  return response.data;
};

/** Fetch available catalog filter options (categories, price ranges). */
export const fetchCatalogFilters = async () => {
  const response = await api.get('catalog/filters/');
  return response.data;
};

/** Fetch featured/promoted products for the landing page. */
export const fetchFeaturedProducts = async () => {
  const response = await api.get('catalog/featured/');
  return response.data;
};

/** Fetch products belonging to a specific category. */
export const fetchCategoryProducts = async (categoryId, params = {}) => {
  return fetchCatalog({ ...params, category: categoryId });
};

// ─────────── PRODUCTS ───────────
/** Fetch full product detail including variants and images. */
export const fetchProductDetail = async (productId) => {
  const response = await publicApi.get(`products/${productId}/`);
  return response.data;
};

// ─────────── CART (JWT si autenticado, sesión si anónimo) ───────────
function cartClient() {
  return getAccessToken() ? api : sessionApi;
}

/** Fetch the current user's or anonymous session's cart. */
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

/** Add a product variant to the cart. */
export const addToCart = async (productId, variantId, quantity = 1) => {
  const response = await cartClient().post('cart/add/', {
    product_id: productId,
    variant_id: variantId,
    quantity,
  });
  return response.data;
};

/** Update the quantity of an item in the cart. */
export const updateCartItemQuantity = async (itemId, quantity) => {
  const response = await cartClient().patch(`cart/items/${itemId}/quantity/`, { quantity });
  return response.data;
};

/** Remove a specific item from the cart. */
export const removeCartItem = async (itemId) => {
  await cartClient().delete(`cart/items/${itemId}/remove/`);
};

/** Clear all items from the cart. */
export const clearCart = async () => {
  await cartClient().delete('cart/clear/');
};

// ─────────── ADMIN ───────────
/** Fetch admin dashboard aggregate stats. */
export const fetchAdminStats = async () => {
  const response = await api.get('admin/stats/');
  return response.data;
};

/** Fetch paginated list of all carts (admin). */
export const fetchAdminCarts = async (page = 1, pageSize = 20) => {
  const response = await api.get('admin/carts/', { params: { page, page_size: pageSize } });
  return response.data;
};

/** Fetch detailed cart info by ID (admin). */
export const fetchAdminCartDetail = async (id) => {
  const response = await api.get(`admin/carts/${id}/`);
  return response.data;
};

/** Update a cart's status (admin). */
export const updateCartStatus = async (cartId, status) => {
  const response = await api.patch(`admin/carts/${cartId}/status/`, { status });
  return response.data;
};

/** Fetch paginated user list (admin). */
export const fetchAdminUsers = async (params = {}) => {
  const response = await api.get('admin/usuarios/', { params });
  return response.data;
};

/** Create a new user from the admin panel. */
export const createAdminUser = async (data) => {
  const response = await api.post('admin/usuarios/', data);
  return response.data;
};

/** Update user details from the admin panel. */
export const updateAdminUser = async (id, data) => {
  const response = await api.patch(`admin/usuarios/${id}/`, data);
  return response.data;
};

/** Perform an admin action on a user (block, activate, etc.). */
export const adminUserAction = async (userId, action, payload = {}) => {
  const response = await api.post(`admin/usuarios/${userId}/${action}/`, payload);
  return response.data;
};

/** Fetch all contact form submissions (admin). */
export const fetchContactMessages = async () => {
  const response = await api.get('contacto/');
  return response.data;
};

/** Mark a contact message as read (admin). */
export const markContactRead = async (id) => {
  const response = await api.post(`contacto/${id}/marcar_leido/`);
  return response.data;
};

/** Delete a contact message (admin). */
export const deleteContactMessage = async (id) => {
  await api.delete(`contacto/${id}/eliminar/`);
};

/** Fetch paginated admin audit logs. */
export const fetchAuditLogs = async (page = 1, pageSize = 20) => {
  const response = await api.get('admin/usuarios/auditoria/', { params: { page, page_size: pageSize } });
  return response.data;
};

// ─────────── ADMIN ORDERS ───────────
/** Fetch paginated orders list (admin). */
export const fetchAdminOrders = async (page = 1, pageSize = 20) => {
  const response = await api.get('admin/orders/', { params: { page, page_size: pageSize } });
  return response.data;
};

/** Fetch detailed order info by ID (admin). */
export const fetchAdminOrderDetail = async (id) => {
  const response = await api.get(`admin/orders/${id}/`);
  return response.data;
};

/** Update the status of an order (admin). */
export const updateOrderStatus = async (id, status) => {
  const response = await api.patch(`admin/orders/${id}/status/`, { status });
  return response.data;
};

/** Trigger reprocessing for a failed order (admin). */
export const reprocessOrder = async (id) => {
  const response = await api.post(`admin/orders/${id}/reprocess/`);
  return response.data;
};

// ─────────── CHECKOUT / PAYMENT ───────────
/** Fetch a summary of the current cart for the checkout page. */
export const fetchCheckoutSummary = async () => {
  const response = await sessionApi.get('checkout/summary/');
  return response.data;
};

/** Initialize checkout with shipping data, returns an order. */
export const initCheckout = async (shippingData) => {
  const response = await sessionApi.post('checkout/init/', shippingData);
  return response.data;
};

/** Create a payment session for a given order (Wompi). */
export const createPayment = async (orderId) => {
  const response = await sessionApi.post('checkout/create-payment/', { order_id: orderId });
  return response.data;
};

/** Check payment status by payment gateway reference. */
export const fetchPaymentStatus = async (reference) => {
  const response = await sessionApi.get('checkout/payment-status/', { params: { reference } });
  return response.data;
};

// ─────────── REVIEWS ───────────
/** Fetch all reviews for a product. */
export const fetchProductReviews = async (productId) => {
  const response = await publicApi.get('products/reviews/', { params: { product: productId } });
  return response.data;
};

/** Create a new product review (authenticated users only). */
export const createReview = async (productId, rating, comment) => {
  const response = await api.post('products/reviews/', { product: productId, rating, comment });
  return response.data;
};

/** Update an existing product review. */
export const updateReview = async (reviewId, rating, comment) => {
  const response = await api.patch(`products/reviews/${reviewId}/`, { rating, comment });
  return response.data;
};

// ─────────── INVOICES ───────────
/** Generate an invoice for a completed order. */
export const generateInvoice = async (orderId) => {
  const response = await api.post('orders/invoices/generate/', { order_id: orderId });
  return response.data;
};

/** Fetch a specific invoice by ID. */
export const fetchInvoice = async (invoiceId) => {
  const response = await api.get(`orders/invoices/${invoiceId}/`);
  return response.data;
};

/** Fetch the invoice associated with a specific order. */
export const fetchOrderInvoice = async (orderId) => {
  const response = await api.get('orders/invoices/', { params: { order: orderId } });
  return response.data;
};
