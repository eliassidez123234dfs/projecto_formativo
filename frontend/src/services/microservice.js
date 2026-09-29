/**
 * microservice.js — Cliente HTTP del microservicio Spring Boot (JPA).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * EN QUÉ SE DIFERENCIA DE api.js
 * ══════════════════════════════════════════════════════════════════════════
 *  ┌───────────────┬──────────────────┬──────────────────────────────┐
 *  │ Archivo       │ Backend          │ baseURL                      │
 *  ├───────────────┼──────────────────┼──────────────────────────────┤
 *  │ api.js        │ Django  (:8000)  │ /api/  (REST de DRF)         │
 *  │ microservice  │ Spring   (:8082) │ /api/v1/ (este archivo)      │
 *  └───────────────┴──────────────────┴──────────────────────────────┘
 *
 * El prefijo '/api/v1' está declarado en el proxy de vite.config.js y se
 * redirige a http://localhost:8082. Por eso las llamadas del servicio de
 * productos se escriben sin host: msApi.delete('productos/42') termina siendo
 * DELETE http://localhost:8082/api/v1/productos/42.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * RESPONSABILIDADES
 * ══════════════════════════════════════════════════════════════════════════
 *  - Instancia de axios con la baseURL y política de credenciales correctas.
 *  - Inyectar el JWT en cada petición (Authorization: Bearer).
 *  - Loguear errores HTTP distintos de 401 para debug.
 *
 * NO se hace fetch directo aquí: axios centraliza timeouts, headers y errores
 * en un solo lugar, en vez de repetir try/catch en cada función de servicio.
 */
import axios from 'axios';
import { getAccessToken } from './authService';

/**
 * Base URL del microservicio.
 * Desarrollo: '/api/v1' → proxy de Vite → localhost:8082.
 * Producción: variable de entorno VITE_MICROSERVICE_URL.
 */
const MICROSERVICE_BASE = import.meta.env.VITE_MICROSERVICE_URL || '/api/v1';

/**
 * Instancia de axios exclusiva del microservicio.
 * withCredentials:false porque el microservicio autentica con JWT en header,
 * no con cookie de sesión.
 */
const msApi = axios.create({
  baseURL: MICROSERVICE_BASE,
  withCredentials: false,
});

/**
 * Interceptor de petición: agrega el token si el usuario está autenticado.
 * Si no hay token igual se envía — hay endpoints públicos (catálogo).
 */
msApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Interceptor de respuesta: loguea los errores para poder verlos en DevTools.
 * Los 401 se omiten porque el refresh de token lo maneja api.js.
 */
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
