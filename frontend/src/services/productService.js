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
    // En los listados Spring solo devuelve los conteos, no las listas. Por eso
    // aquí se cae a la imagen principal: el catálogo no necesita la galería
    // completa y pedirla sería una respuesta desproporcionada.
    images: mainImage ? [{ image_url: mainImage, is_main: true }] : [],
    variants: [],
  };
}

/**
 * Adapta las imágenes que devuelve Spring a la forma que espera la vista admin.
 *
 * Spring expone `image` (URL cruda) y `cloudinaryUrl` ya resuelto; la vista
 * espera `image_url` + `is_main`.
 */
function adaptImages(springImages, fallbackMainImage) {
  if (Array.isArray(springImages) && springImages.length > 0) {
    return springImages.map((img) => ({
      id: img.id,
      image_url: img.cloudinaryUrl || cloudinaryImageUrl(img.image),
      is_main: Boolean(img.esPrincipal),
    }));
  }
  return fallbackMainImage ? [{ image_url: fallbackMainImage, is_main: true }] : [];
}

/**
 * Adapta las variantes de Spring a la forma de la vista admin, replicando la
 * etiqueta que armaba Django con `Talla {size} — {color}`.
 *
 * `price_variant` puede venir null: entonces el precio efectivo es el del
 * producto, que Spring ya calcula y devuelve como `precio_efectivo`.
 */
function adaptVariants(springVariants) {
  if (!Array.isArray(springVariants)) return [];
  return springVariants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    color_hex: v.colorHex,
    color_nombre: v.colorNombre,
    stock: v.stock,
    price_variant: v.priceVariant,
    precio_efectivo: v.precioEfectivo,
  }));
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
 * Detalle admin.
 *
 * Imágenes y variantes salen de Spring: en la rama java/mongoDB viven en
 * MongoDB y Django no puede resolverlas por ObjectId (su FK de producto apunta
 * a products_product). Pedirlas a Django con un ObjectId devolvía 404 y la
 * vista se quedaba sin galería ni variantes, sin error visible.
 *
 * De Django solo se conserva lo que sí vive en PostgreSQL: las categorías
 * (catalog_productcategory, por product_ref) y el checklist de publicación.
 * Si esa llamada falla, el detalle se muestra igualmente con los datos de
 * Spring en vez de romperse.
 */
export const fetchMicroProductAdmin = async (id) => {
  const springRaw = (await msApi.get(`productos/${id}`)).data;
  const micro = adaptProduct(springRaw);
  micro.images = adaptImages(springRaw.imagenes, micro.main_image);
  micro.variants = adaptVariants(springRaw.variantes);

  try {
    const django = await fetchProductAdmin(id);
    return {
      ...micro,
      sku: micro.sku || django.referencia,
      categories: Array.isArray(django.categories) ? django.categories : [],
      checklist: django.checklist,
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
