import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true,   // ← para enviar la cookie de sesión
});

// Cliente público para endpoints que deben ser accesibles sin sesión/token
const publicApi = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: false,
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

// ─────────── CART (correcto según tu backend) ───────────
export const fetchCart = async () => {
  try {
    const response = await api.get('cart/');
    return response.data;
  } catch (err) {
    // Si no hay sesión, devolver carrito vacío en lugar de propagar 401
    if (err.response && err.response.status === 401) {
      return { items: [], total_items: 0, total_amount: '0.00' };
    }
    throw err;
  }
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