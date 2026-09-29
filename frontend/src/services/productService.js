/**
 * productService.js — CRUD de productos vía microservicio Spring Boot (JPA).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * FLUJO DE DATOS COMPLETO (ej. el botón "Eliminar" de ProductList.jsx)
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  1. ProductList.jsx  <button onClick={handleDelete(p.id)}>
 *  2. handleDelete(id)         → setDeleteConfirmation(id)  (abre el modal,
 *                                  NO dispara red todavía)
 *  3. Modal → confirmDelete()  → deleteMicroProduct(id)
 *  4. deleteMicroProduct(id)   → msApi.delete(`productos/${id}`)
 *  5. microservice.js          → axios con baseURL '/api/v1'
 *  6. vite.config.js           → proxy '/api/v1' ⇒ http://localhost:8082
 *  7. ProductoController.java  → @DeleteMapping("/{id}") → eliminarProducto(id)
 *  8. ProductoServiceImpl.java → eliminarLogico(id) → estado = BORRADO
 *  9. ProductoRepository.java  → findById + save  ⇒  UPDATE en PostgreSQL Neon
 * 10. ← 204 No Content  ·  microservice.js  ·  confirmDelete()  ·  modal success
 *
 * ══════════════════════════════════════════════════════════════════════════
 * RESPONSABILIDAD DE ESTE ARCHIVO
 * ══════════════════════════════════════════════════════════════════════════
 * Es la capa anti-corruption entre dos contratos JSON distintos: Spring
 * devuelve el vocabulario del dominio Java (español) y React espera el de
 * Django DRF (inglés). Sin este adaptador habría que tocar cada componente.
 *
 *   Django: { results: [...], count: N }
 *   Spring: { content: [...], totalElements: N, pageNumber: 0, totalPages: 5 }
 *
 * Campos Spring → Django:
 *   nombre→name, precioBase→base_price, aprobado→is_approved,
 *   wasDisapproved→was_disapproved, readyToPublish→ready_to_publish, etc.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ HAY DOS OPERACIONES DE BORRADO, CON NOMBRES DISTINTOS A PROPÓSITO
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  ┌───────────────────────┬───────────┬────────────────────────────────┐
 *  │ Función               │ Tipo      │ Qué hace en el backend         │
 *  ├───────────────────────┼───────────┼────────────────────────────────┤
 *  │ deleteMicroProduct(id)│ Soft      │ DELETE /{id} → estado=BORRADO  │
 *  │                       │           │ (UPDATE, la fila no se borra)  │
 *  ├───────────────────────┼───────────┼────────────────────────────────┤
 *  │ purgarMicroProduct(id)│ Hard      │ DELETE /{id}/purgar            │
 *  │                       │           │ → JPA deleteById() real        │
 *  └───────────────────────┴───────────┴────────────────────────────────┘
 *
 *  `deleteMicroProduct` la usa el botón "Eliminar" del catálogo.
 *  `purgarMicroProduct` la usa el panel de aprobaciones (AdminProductApproval).
 *  NO usar el alias `deleteProduct`: es ambiguo (ver su @deprecated abajo).
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
 * Detalle admin: base desde Spring + imagenes/variantes/categorias desde Django.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ES HÍBRIDO
 * ══════════════════════════════════════════════════════════════════════════
 * El producto base (nombre, precio, stock, estado) es del microservicio JPA,
 * pero sus sub-recursos —imágenes, variantes y categorías— siguen en Django
 * porque ahí están los modelos, la lógica de Cloudinary y la validación de
 * tallas. Duplicar eso en Java no aportaba nada.
 *
 * Por eso editar un producto son dos peticiones a backends distintos: los
 * datos base van a Spring y las categorías sólo se pueden escribir por
 * Django (ver `syncProductCategories` en api.js).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ `categories` SIEMPRE es un array, incluso si Django falla
 * ══════════════════════════════════════════════════════════════════════════
 * Antes el `catch` devolvía el objeto de Spring tal cual, sin la propiedad
 * `categories`. ProductForm hacía `(product?.categories || [])`, así que un
 * fallo de Django se traducía en "este producto no tiene categorías": los
 * checkboxes se mostraban sin marcar y, al guardar, esa visión equivocada
 * pisaba las categorías reales. Un fallo de red nunca debe parecer un dato.
 *
 * @param {number|string} id
 * @returns {Promise<Object>} Producto con `categories` garantizado como array
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
  } catch (e) {
    // Django no respondió. Se devuelve la base de Spring con las listas vacías
    // explícitas, y se avisa por consola: el formulario va a abrir sin
    // categorías y avisar, en vez de fingir que el producto no tiene ninguna.
    console.error(
      `[ProductForm] Django no devolvió los sub-recursos del producto ${id}. ` +
      'Imágenes, variantes y categorías pueden no cargarse.', e,
    );
    return {
      ...micro,
      images: micro.images,
      variants: micro.variants,
      categories: [],
      checklist: null,
    };
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

/**
 * DELETE soft — marca el producto como BORRADO.
 *
 * Petición: DELETE /api/v1/productos/{id}  →  Spring  →  ProductoController
 *           .eliminarProducto()  →  ProductoServiceImpl.eliminarLogico()
 *           →  UPDATE products_product SET estado='BORRADO'.
 *
 * ⚠️ NO borra físicamente la fila. El endpoint usa el verbo DELETE (REST) pero
 *    internamente es un UPDATE, a propósito: las órdenes históricas apuntan al
 *    producto y un DELETE físico rompería la integridad referencial.
 *
 * ⚠️ Sin body: el ID ya viaja en la URL, así que un payload sería redundante.
 *    RFC 9110 §9.3.5 dice que el body de un DELETE no tiene semántica definida.
 *
 * A diferencia de create/update, la respuesta (204 No Content) no trae datos,
 * por eso no hay `adaptProduct`. Igual se devuelve la metadata del status para
 * que quede explícito que la request fue al microservicio y volvió.
 *
 * @param {number|string} id
 * @returns {Promise<{success: boolean, status: number, id: number|string,
 *                    operation: string, message: string}>}
 */
export const deleteMicroProduct = async (id) => {
  const response = await msApi.delete(`productos/${id}`);
  return {
    success: response.status === 204,
    status: response.status,
    id,
    operation: 'soft-delete',
    message: 'Producto marcado como BORRADO',
  };
};

/**
 * DELETE físico (purga) — elimina la fila de PostgreSQL.
 *
 * Petición: DELETE /api/v1/productos/{id}/purgar  →  ProductoController
 *           .purgarProducto()  →  ProductoServiceImpl.purgarProducto()
 *           →  productoRepository.deleteById(id)  →  DELETE real en la BD.
 *
 * Guardas en el service (si alguna falla → 400):
 *   1. El producto debe estar en BORRADO o RECHAZADO.
 *   2. No debe tener órdenes asociadas (se consulta a Django).
 *
 * @param {number|string} id
 * @returns {Promise<{success: boolean, status: number, id: number|string,
 *                    operation: string, message: string}>}
 */
export const purgarMicroProduct = async (id) => {
  const response = await msApi.delete(`productos/${id}/purgar`);
  return {
    success: response.status === 204,
    status: response.status,
    id,
    operation: 'hard-delete',
    message: 'Producto eliminado permanentemente',
  };
};

/**
 * @deprecated Usar el nombre explícito. Este alias apunta a la PURGA
 * (hard delete), mientras que el `deleteProduct` que exporta api.js apunta al
 * SOFT delete: mismo nombre, dos comportamientos opuestos.
 *
 *   deleteMicroProduct(id) → soft (UPDATE estado=BORRADO)
 *   purgarMicroProduct(id) → hard (DELETE físico)
 *
 * Se conserva sólo para no romper imports históricos; no usarlo en código nuevo.
 */
export const deleteProduct = purgarMicroProduct;
