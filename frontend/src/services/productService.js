/**
 * productService.js — CRUD de productos vía microservicio Spring Boot.
 *
 * Adapta la respuesta de Spring (/api/v1/productos) al formato DRF que
 * los componentes React ya esperan:
 *
 *   Django: { results: [...], count: N }
 *   Spring: { content: [...], totalElements: N, pageNumber: 0, totalPages: 5 }
 *
 * Campos Spring → Django:
 *   nombre→name, precioBase→base_price, aprobado→is_approved,
 *   wasDisapproved→was_disapproved, readyToPublish→ready_to_publish, etc.
 */
import msApi from './microservice';
import { fetchProductAdmin } from './api';

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

function cloudinaryImageUrl(publicId) {
  if (!publicId) return null;
  if (/^https?:\/\//.test(publicId)) return publicId;
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'doa7qxr0d';
  return `https://res.cloudinary.com/${cloud}/image/upload/${publicId}`;
}

function adaptProduct(spring) {
  const mainImage = cloudinaryImageUrl(spring.mainImage);
  const isActive = spring.isActive ?? (spring.estado === 'ACTIVO');
  const isApproved = spring.aprobado ?? false;
  return {
    id: spring.id,
    // Versión de bloqueo optimista. El backend la compara en cada PUT y
    // responde 409 si otro usuario/editó el producto mientras el formulario
    // estaba abierto. Si el form no la reenvía, el chequeo no puede ocurrir.
    version: spring.version,
    name: spring.nombre,
    description: spring.descripcion,
    base_price: spring.precioBase,
    referencia: spring.referencia,
    sku: spring.referencia,
    stock: spring.stock,
    total_stock: spring.totalStock ?? spring.stock ?? 0,
    is_active: isActive,
    is_approved: isApproved,
    estado: spring.estado,
    main_image: mainImage,
    images_count: spring.imagesCount ?? (mainImage ? 1 : 0),
    variants_count: spring.variantsCount ?? 0,
    ready_to_publish: spring.readyToPublish ?? false,
    was_disapproved: spring.wasDisapproved ?? false,
    was_published: spring.wasPublished ?? false,
    was_deleted: spring.wasDeleted ?? false,
    created_at: spring.createdAt,
    updated_at: spring.updatedAt,
    images: mainImage ? [{ image_url: mainImage, is_main: true }] : [],
    variants: [],
  };
}

function parseBool(v) {
  if (v === true || v === false) return v;
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return undefined;
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

/**
 * Lista productos (CRUD leer/buscar) con filtros paridad Django:
 * search, is_active, is_approved, min_price, max_price, ordering, page, page_size.
 */
export const fetchMicroProducts = async (params = {}) => {
  const springParams = {
    page: params.page ? params.page - 1 : 0,
    page_size: params.page_size || params.pageSize || 20,
    sortBy: 'id',
    sortDir: 'desc',
  };
  if (params.search) springParams.search = params.search;
  if (params.estado) springParams.estado = params.estado;
  if (params.ordering) springParams.ordering = params.ordering;

  const isApproved = parseBool(params.is_approved);
  if (isApproved !== undefined) springParams.is_approved = isApproved;
  const isActive = parseBool(params.is_active);
  if (isActive !== undefined) springParams.is_active = isActive;
  if (params.min_price != null && params.min_price !== '') springParams.min_price = params.min_price;
  if (params.max_price != null && params.max_price !== '') springParams.max_price = params.max_price;

  const response = await msApi.get('productos', { params: springParams });
  return adaptPageResponse(response.data);
};

/**
 * Detalle admin: base desde Spring + imagenes/variantes/categorias desde Django
 * (esos sub-recursos siguen en Django: DELETE /images/{id}, /variants/{id}).
 */
export const fetchMicroProductAdmin = async (id) => {
  const micro = adaptProduct((await msApi.get(`productos/${id}`)).data);
  try {
    const django = await fetchProductAdmin(id);
    return {
      ...micro,
      sku: micro.sku || django.referencia,
      is_active: django.is_active ?? micro.is_active,
      is_approved: django.is_approved ?? micro.is_approved,
      images: Array.isArray(django.images) ? django.images : micro.images,
      variants: Array.isArray(django.variants) ? django.variants : micro.variants,
      categories: Array.isArray(django.categories) ? django.categories : [],
      checklist: django.checklist,
      ready_to_publish: django.ready_to_publish ?? micro.ready_to_publish,
      was_disapproved: django.was_disapproved ?? micro.was_disapproved,
      was_published: django.was_published ?? micro.was_published,
      was_deleted: django.was_deleted ?? micro.was_deleted,
    };
  } catch {
    return micro;
  }
};

/** Alias para que AdminProductApproval use Spring como fetchProducts. */
export const fetchProducts = fetchMicroProducts;

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

export const updateMicroProduct = async (id, data) => {
  // Se relee el producto para tener la versión vigente: el formulario puede
  // llevar segundos abierto y la versión que trae `data` ya quedó obsoleta.
  const existing = (await msApi.get(`productos/${id}`)).data;

  const springData = {
    nombre: data.name || data.nombre || existing.nombre,
    descripcion: data.description ?? data.descripcion ?? existing.descripcion ?? '',
    precioBase: data.base_price ?? data.precioBase ?? existing.precioBase,
    referencia: data.referencia || data.sku || existing.referencia,
    stock: data.stock ?? existing.stock,
    // Bloqueo optimista: se envía la versión conocida para que el backend
    // detecte ediciones concurrentes en vez de pisarlas. 409 = conflicto.
    version: data.version ?? existing.version,
  };

  const response = await msApi.put(`productos/${id}`, springData);
  return adaptProduct(response.data);
};

/** Soft delete (oculta del catálogo, queda en BD como BORRADO). */
export const deleteMicroProduct = async (id) => {
  await msApi.delete(`productos/${id}`);
};

/** Hard delete total de la BD (solo desaprobados / soft-delete con auditoría). */
export const purgarMicroProduct = async (id) => {
  await msApi.delete(`productos/${id}/purgar`);
};

/** Alias naming para el panel de aprobaciones. */
export const deleteProduct = purgarMicroProduct;
