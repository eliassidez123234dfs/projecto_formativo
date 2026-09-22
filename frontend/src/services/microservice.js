/**
 * microservice.js — Cliente HTTP para el microservicio Spring Boot.
 *
 * Se comunica con el microservicio JPA/MongoDB en /api/v1/productos.
 * Adapta las respuestas del microservicio al formato que los componentes
 * React del frontend ya esperan (formato DRF de Django).
 */
import axios from 'axios';
import { getAccessToken } from './authService';

const MICROSERVICE_BASE = import.meta.env.VITE_MICROSERVICE_URL || '/api/v1';

const msApi = axios.create({
  baseURL: MICROSERVICE_BASE,
  withCredentials: false,
});

msApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

msApi.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    if (status && status !== 401) {
      console.error(`[Microservice] ${status} ${url}:`, error?.response?.data);
    }
    return Promise.reject(error);
  }
);

export default msApi;
