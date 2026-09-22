/**
 * productService.js — Servicio de productos que consume el microservicio Spring Boot.
 *
 * Adapta la respuesta del microservicio (/api/v1/productos) al formato
 * que los componentes React ya esperan del backend Django:
 *
 *   Django: { results: [...], count: N }
 *   Spring: { content: [...], totalElements: N, pageNumber: 0, totalPages: 5 }
 *
 * Mantiene la misma interfaz pública que las funciones de api.js
 * para que los componentes no necesiten cambios.
 */
import msApi from './microservice';

// ─────────── MAPEO DE RESPUESTAS ───────────

/**
 * Convierte la respuesta paginada del microservicio al formato DRF del frontend.
 * Spring Boot: { content, pageNumber, pageSize, totalElements, totalPages, last }
 * Django DRF:  { results, count, next, previous }
 */
function adaptPageResponse(springPage) {
  return {
    results: (springPage.content || []).map(adaptProduct),
    count: springPage.totalElements || 0,
    next: springPage.last ? null : `?page=${springPage.pageNumber + 2}`,
    previous: springPage.pageNumber === 0 ? null : `?page=${springPage.pageNumber}`,
    _spring: {
      pageNumber: springPage.pageNumber,
      pageSize: springPage.pageSize,
      totalPages: springPage.totalPages,
      last: springPage.last,
    },
  };
}

/**
 * Convierte un producto del formato Spring Boot al formato Django
 * que los componentes React ya esperan.
 *
 * Spring: { id, nombre, precioBase, referencia, estado, stock, aprobado, ... }
 * Django: { id, name, base_price, total_stock, is_active, is_approved, main_image, ... }
 */
function adaptProduct(spring) {
  return {
    id: spring.id,
    name: spring.nombre,
    description: spring.descripcion,
    base_price: spring.precioBase,
    referencia: spring.referencia,
    sku: spring.referencia,
    total_stock: spring.stock,
    stock: spring.stock,
    is_active: spring.estado === 'ACTIVO',
    is_approved: spring.aprobado,
    estado: spring.estado,
    main_image: null,
    images_count: 0,
    variants_count: 0,
    images: [],
    variants: [],
    created_at: spring.createdAt,
    updated_at: spring.updatedAt,
  };
}

// ─────────── CATALOG (público) ───────────

/**
 * Lista productos del catálogo con paginación y filtros.
 * Adapta los parámetros del frontend al formato del microservicio.
 */
export const fetchMicroCatalog = async (params = {}) => {
  const springParams = {
    page: params.page ? params.page - 1 : 0,  // Django usa base 1, Spring base 0
    size: params.page_size || params.pageSize || 10,
    sortBy: params.ordering === 'popularity' ? 'nombre' : 'id',
    sortDir: params.ordering === '-name' ? 'desc' : 'asc',
  };
  if (params.search) springParams.search = params.search;
  if (params.category) springParams.nombre = params.category;

  const response = await msApi.get('productos', { params: springParams });
  return adaptPageResponse(response.data);
};

/**
 * Detalle de un producto por ID.
 */
export const fetchMicroProductDetail = async (productId) => {
  const response = await msApi.get(`productos/${productId}`);
  return adaptProduct(response.data);
};

// ─────────── ADMIN CRUD ───────────

/**
 * Lista productos del admin con paginación.
 */
export const fetchMicroProducts = async (params = {}) => {
  const springParams = {
    page: params.page ? params.page - 1 : 0,
    size: params.page_size || 20,
    sortBy: 'id',
    sortDir: 'desc',
  };
  if (params.search) springParams.search = params.search;
  if (params.estado) springParams.estado = params.estado;

  const response = await msApi.get('productos', { params: springParams });
  return adaptPageResponse(response.data);
};

/**
 * Detalle de un producto (admin).
 */
export const fetchMicroProductAdmin = async (id) => {
  const response = await msApi.get(`productos/${id}`);
  return adaptProduct(response.data);
};

/**
 * Crear un producto.
 * Mapea los campos del formulario Django al formato del microservicio.
 */
export const createMicroProduct = async (data) => {
  const springData = {
    nombre: data.name || data.nombre,
    descripcion: data.description || data.descripcion || '',
    precioBase: data.base_price || data.precioBase,
    referencia: data.referencia || data.sku || 'SIN-REF',
    stock: data.stock || 0,
  };
  const response = await msApi.post('productos', springData);
  return adaptProduct(response.data);
};

/**
 * Actualizar un producto (PATCH).
 */
export const updateMicroProduct = async (id, data) => {
  const existing = (await msApi.get(`productos/${id}`)).data;

  const springData = {
    nombre: data.name || data.nombre || existing.nombre,
    descripcion: data.description ?? data.descripcion ?? existing.descripcion ?? '',
    precioBase: data.base_price ?? data.precioBase ?? existing.precioBase,
    referencia: data.referencia || data.sku || existing.referencia,
    stock: data.stock ?? existing.stock,
  };

  const response = await msApi.put(`productos/${id}`, springData);
  return adaptProduct(response.data);
};

/**
 * Eliminar un producto (soft delete).
 */
export const deleteMicroProduct = async (id) => {
  await msApi.delete(`productos/${id}`);
};
