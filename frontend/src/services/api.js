import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true,   // ← para enviar la cookie de sesión
});

// Interceptor para adjuntar token JWT si existe (para endpoints protegidos)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────── CATALOG ───────────
export const fetchCatalog = async (params = {}) => {
  const response = await api.get('catalog/', { params });
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

// ─────────── PRODUCTS ───────────
export const fetchProductDetail = async (productId) => {
  const response = await api.get(`products/${productId}/`);
  return response.data;
};

// ─────────── CART (correcto según tu backend) ───────────
export const fetchCart = async () => {
  const response = await api.get('cart/');
  return response.data;
};

export const addToCart = async (productId, variantId, quantity = 1) => {
  const response = await api.post('cart/add/', {
    product_id: productId,
    variant_id: variantId,
    quantity,
  });
  return response.data;
};

export const updateCartItemQuantity = async (itemId, quantity) => {
  const response = await api.patch(`cart/items/${itemId}/quantity/`, { quantity });
  return response.data;
};

export const removeCartItem = async (itemId) => {
  await api.delete(`cart/items/${itemId}/remove/`);
};