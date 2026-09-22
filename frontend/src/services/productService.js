/**
 * productService.js — Servicio de productos que consume el microservicio Spring Boot.
 *
 * Adapta la respuesta del microservicio (/api/v1/productos) al formato
 * que los componentes React ya esperan del backend Django.
 */
import msApi from './microservice';

// ─────────── MAPEO DE RESPUESTAS ───────────

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

function adaptProduct(spring) {
  return {
    id: spring.id,
    name: spring.nombre,
    description: spring.descripcion,
    base_price: spring.precioBase,
    sku: spring.referencia,
    total_stock: spring.stock,
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

export const fetchMicroCatalog = async (params = {}) => {
  const springParams = {
    page: params.page ? params.page - 1 : 0,
    size: params.page_size || params.pageSize || 10,
    sortBy: params.ordering === 'popularity' ? 'nombre' : 'id',
    sortDir: params.ordering === '-name' ? 'desc' : 'asc',
  };
  if (params.search) springParams.search = params.search;
  if (params.category) springParams.nombre = params.category;

  const response = await msApi.get('productos', { params: springParams });
  return adaptPageResponse(response.data);
};

export const fetchMicroProductDetail = async (productId) => {
  const response = await msApi.get(`productos/${productId}`);
  return adaptProduct(response.data);
};

// ─────────── ADMIN CRUD ───────────

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

export const fetchMicroProductAdmin = async (id) => {
  const response = await msApi.get(`productos/${id}`);
  return adaptProduct(response.data);
};

export const createMicroProduct = async (data) => {
  const springData = {
    nombre: data.name || data.nombre,
    descripcion: data.description || data.descripcion || '',
    precioBase: data.base_price || data.precioBase,
    referencia: data.sku || data.referencia,
    stock: data.total_stock || data.stock || 0,
  };
  const response = await msApi.post('productos', springData);
  return adaptProduct(response.data);
};

export const updateMicroProduct = async (id, data) => {
  const springData = {};
  if (data.name || data.nombre) springData.nombre = data.name || data.nombre;
  if (data.description !== undefined || data.descripcion !== undefined)
    springData.descripcion = data.description ?? data.descripcion;
  if (data.base_price !== undefined || data.precioBase !== undefined)
    springData.precioBase = data.base_price ?? data.precioBase;
  if (data.sku || data.referencia) springData.referencia = data.sku || data.referencia;
  if (data.total_stock !== undefined || data.stock !== undefined)
    springData.stock = data.total_stock ?? data.stock;

  const response = await msApi.put(`productos/${id}`, springData);
  return adaptProduct(response.data);
};

export const deleteMicroProduct = async (id) => {
  await msApi.delete(`productos/${id}`);
};
