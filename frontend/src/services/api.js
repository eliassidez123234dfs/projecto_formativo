import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/';
export const buildApiUrl = (endpoint) => `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

const sessionApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
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
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usuario');
        return Promise.reject(error);
      }
      try {
        const response = await axios.post(
          `${API_BASE_URL.replace(/\/+$/, '')}/token/refresh/`,
          { refresh: refreshToken }
        );
        const newToken = response.data.access;
        localStorage.setItem('access_token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usuario');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─────────── CATALOG ───────────
export const fetchCatalog = async (params = {}) => {
  const response = await publicApi.get('catalog/', { params });
  return response.data;
};

export const fetchCatalogFilters = async () => {
  const response = await api.get('catalog/filters/');
  return response.data;
};

export const fetchFeaturedProducts = async () => {
  const response = await api.get('catalog/featured/');
  return response.data;
};

export const fetchCategoryProducts = async (categoryId, params = {}) => {
  return fetchCatalog({ ...params, category: categoryId });
};

// ─────────── PRODUCTS ───────────
export const fetchProductDetail = async (productId) => {
  const response = await publicApi.get(`products/${productId}/`);
  return response.data;
};

// ─────────── CART (JWT si autenticado, sesión si anónimo) ───────────
function cartClient() {
  return localStorage.getItem('access_token') ? api : sessionApi;
}

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

export const addToCart = async (productId, variantId, quantity = 1) => {
  const response = await cartClient().post('cart/add/', {
    product_id: productId,
    variant_id: variantId,
    quantity,
  });
  return response.data;
};

export const updateCartItemQuantity = async (itemId, quantity) => {
  const response = await cartClient().patch(`cart/items/${itemId}/quantity/`, { quantity });
  return response.data;
};

export const removeCartItem = async (itemId) => {
  await cartClient().delete(`cart/items/${itemId}/remove/`);
};

export const clearCart = async () => {
  await cartClient().delete('cart/clear/');
};

// ─────────── ADMIN ───────────
export const fetchAdminStats = async () => {
  const response = await api.get('admin/stats/');
  return response.data;
};

export const fetchAdminCarts = async (page = 1, pageSize = 20) => {
  const response = await api.get('admin/carts/', { params: { page, page_size: pageSize } });
  return response.data;
};

export const fetchAdminCartDetail = async (id) => {
  const response = await api.get(`admin/carts/${id}/`);
  return response.data;
};

export const updateCartStatus = async (cartId, status) => {
  const response = await api.patch(`admin/carts/${cartId}/status/`, { status });
  return response.data;
};

export const fetchAdminUsers = async (params = {}) => {
  const response = await api.get('admin/usuarios/', { params });
  return response.data;
};

export const createAdminUser = async (data) => {
  const response = await api.post('admin/usuarios/', data);
  return response.data;
};

export const updateAdminUser = async (id, data) => {
  const response = await api.patch(`admin/usuarios/${id}/`, data);
  return response.data;
};

export const adminUserAction = async (userId, action, payload = {}) => {
  const response = await api.post(`admin/usuarios/${userId}/${action}/`, payload);
  return response.data;
};

export const fetchContactMessages = async () => {
  const response = await api.get('contacto/');
  return response.data;
};

export const markContactRead = async (id) => {
  const response = await api.post(`contacto/${id}/marcar_leido/`);
  return response.data;
};

export const deleteContactMessage = async (id) => {
  await api.delete(`contacto/${id}/eliminar/`);
};

export const fetchAuditLogs = async (page = 1, pageSize = 20) => {
  const response = await api.get('admin/usuarios/auditoria/', { params: { page, page_size: pageSize } });
  return response.data;
};

// ─────────── ADMIN ORDERS ───────────
export const fetchAdminOrders = async (page = 1, pageSize = 20) => {
  const response = await api.get('admin/orders/', { params: { page, page_size: pageSize } });
  return response.data;
};

export const fetchAdminOrderDetail = async (id) => {
  const response = await api.get(`admin/orders/${id}/`);
  return response.data;
};

export const updateOrderStatus = async (id, status) => {
  const response = await api.patch(`admin/orders/${id}/status/`, { status });
  return response.data;
};

export const reprocessOrder = async (id) => {
  const response = await api.post(`admin/orders/${id}/reprocess/`);
  return response.data;
};

// ─────────── CHECKOUT / PAYMENT ───────────
export const fetchCheckoutSummary = async () => {
  const response = await sessionApi.get('checkout/summary/');
  return response.data;
};

export const initCheckout = async (shippingData) => {
  const response = await sessionApi.post('checkout/init/', shippingData);
  return response.data;
};

export const createPayment = async (orderId) => {
  const response = await sessionApi.post('checkout/create-payment/', { order_id: orderId });
  return response.data;
};

export const fetchPaymentStatus = async (reference) => {
  const response = await sessionApi.get('checkout/payment-status/', { params: { reference } });
  return response.data;
};