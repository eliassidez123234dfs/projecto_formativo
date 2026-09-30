/**
 * ProductForm.jsx — Formulario modal para crear o editar productos (admin).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ UN SOLO COMPONENTE PARA CREAR Y EDITAR
 * ══════════════════════════════════════════════════════════════════════════
 * La prop `product` decide el modo: si viene null se crea, con datos se edita.
 * Son el mismo formulario porque los campos y las reglas son idénticos; lo que
 * cambia es qué endpoints se llaman y qué se hace con las imágenes y variantes
 * que ya existen. Separarlos would've duplicado ~400 líneas de validación.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * FLUJO DE CARGA (al abrir en modo editar)
 * ══════════════════════════════════════════════════════════════════════════
 *   AdminProducts.openEdit(id)
 *     → productService.fetchMicroProductAdmin(id)
 *         → GET /api/v1/productos/{id}      (Spring: datos base)      ─┐
 *         → GET /api/products/{id}/         (Django: imágenes,       ─┴→ merge
 *                                            variantes, categorías)
 *     → setEditingProduct() + showForm
 *     → ProductForm monta con `product` ya poblado
 *
 * El merge es híbrido a propósito: el producto base es del microservicio JPA,
 * pero imágenes, variantes y categorías son modelos de Django.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * FLUJO DE CREAR (handleSubmit, rama `else`)
 * ══════════════════════════════════════════════════════════════════════════
 *  1. validate()            client-side: precio múltiplo de 50, nombre, etc.
 *  2. validateAllImages()   JPG/PNG/WebP, <2MB, >=400x400
 *  3. createMicroProduct()  POST  /api/v1/productos        → 201  (Spring)
 *  4. syncProductCategories() PATCH /api/products/{id}/          (Django)
 *  5. createProductImage()  POST  /api/products/{id}/images/     (Django)
 *  6. createProductVariant()×N POST /api/products/{id}/variants/  (Django)
 *  → toast.success → onSaved()
 *
 * Si un paso falla después del 3, el ROLLBACK hace soft-delete del producto
 * creado (deleteMicroProduct) para no dejar un producto a medio crear.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * FLUJO DE EDITAR (handleSubmit, rama `if (isEditing)`)
 * ══════════════════════════════════════════════════════════════════════════
 *  1. deleteProductImage()×N  imágenes marcadas          (Django, idempotente)
 *  2. updateMicroProduct()    PUT /api/v1/productos/{id} → 200 (Spring)
 *  2b.syncProductCategories() PATCH /api/products/{id}/       (Django) *
 *  3. updateProductVariant()×N                              (Django)
 *  4. deleteProductVariant()×N                              (Django)
 *  5. createProductVariant()×N                              (Django)
 *  6. updateProductImage()   marcar principal               (Django)
 *  7. reorderProductImages() reordenar                     (Django)
 *  → toast.success → onSaved()
 *
 *   * sólo si el usuario cambió algo. Y va DESPUÉS del PUT de Spring porque
 *     Product.save() en Django bumpea `version` con F('version')+1: si Django
 *     escribiera primero, el PUT de Spring llegaría con versión obsoleta y
 *     respondería 409 sin guardar nada.
 *
 * El orden importa también para el ROLLBACK: primero se borra lo que ya no va,
 * después se actualiza. Al revés, un fallo dejaría datos ya borrados.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * BLOQUEO OPTIMISTA
 * ══════════════════════════════════════════════════════════════════════════
 * `basePayload.version` es la versión con la que se ABRIÓ el modal, no la
 * vigente. Spring compara contra la fila y, si otro usuario guardó mientras
 * tanto, responde 409. El handler de 409 no reintenta a ciegas: reintentar
 * leería la versión nueva y sobrescribiría el trabajo ajeno, que es justo lo
 * que el bloqueo existe para evitar. Cierra el modal y refresca la lista.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DECISIONES DE DISEÑO
 * ══════════════════════════════════════════════════════════════════════════
 * - Las imágenes se difieren al submit: se acumulan en estado local y se
 *   ejecutan todas juntas, para que un fallo no deje el producto a medias.
 * - Las variantes nuevas y existentes se llevan por separado en vez de
 *   mandar un diff: simplifica el caso de una variante recién creada.
 * - VALIDACIÓN COMPLETA client-side antes de cualquier llamada, reflejando
 *   las reglas que igual vuelven a comprobar los dos backends.
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchCategories,
  syncProductCategories,
  createProductImage,
  updateProductImage,
  deleteProductImage,
  reorderProductImages,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from '../services/api'
import { createMicroProduct, updateMicroProduct, deleteMicroProduct } from '../services/productService'
import { formatError as errMsg } from '../utils/formatError'

// ─── CONSTANTES: TALLAS Y COLORES ───
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'Único']

const COLOR_OPTIONS = [
  { value: 'Rojo', hex: '#DC2626' },
  { value: 'Rojo Oscuro', hex: '#991B1B' },
  { value: 'Rojo Claro', hex: '#FCA5A5' },
  { value: 'Azul', hex: '#2563EB' },
  { value: 'Azul Oscuro', hex: '#1E3A5F' },
  { value: 'Azul Claro', hex: '#93C5FD' },
  { value: 'Verde', hex: '#16A34A' },
  { value: 'Verde Oscuro', hex: '#166534' },
  { value: 'Verde Claro', hex: '#86EFAC' },
  { value: 'Negro', hex: '#111827' },
  { value: 'Gris', hex: '#6B7280' },
  { value: 'Gris Claro', hex: '#D1D5DB' },
  { value: 'Blanco', hex: '#FFFFFF' },
  { value: 'Crema', hex: '#FEF3C7' },
  { value: 'Beige', hex: '#F5F5DC' },
  { value: 'Amarillo', hex: '#EAB308' },
  { value: 'Naranja', hex: '#EA580C' },
  { value: 'Morado', hex: '#9333EA' },
  { value: 'Rosa', hex: '#EC4899' },
  { value: 'Marrón', hex: '#78350F' },
  { value: 'Dorado', hex: '#D97706' },
  { value: 'Plateado', hex: '#9CA3AF' },
  { value: 'Azul Marino', hex: '#1E3A5F' },
  { value: 'Vino', hex: '#7F1D1D' },
]

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)', background: 'var(--color-bg)',
  color: 'var(--color-text)', fontSize: 13, outline: 'none',
}
const labelSm = { fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 2 }

// ─── UTILIDADES ───
const PRICE_MAX = 99999999.99
const priceMaxLabel = '$99.999.999,99'

function isValidCopPrice(value) {
  const n = Number(value)
  return Number.isFinite(n) && Number.isInteger(n) && n >= 50 && n <= PRICE_MAX && n % 50 === 0
}

function colorFor(value) {
  return COLOR_OPTIONS.find(c => c.value.toLowerCase() === String(value).toLowerCase())
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024
const MIN_RESOLUTION = 400
const MAX_IMAGES = 5
const MAX_SIZES_PER_PRODUCT = 4
const MAX_COLORS_PER_PRODUCT = 10

async function validateImageFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`"${file.name}": Solo se permiten imagenes JPG, PNG o WebP.`)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`"${file.name}": La imagen no puede superar 2MB.`)
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        if (img.width < MIN_RESOLUTION || img.height < MIN_RESOLUTION) {
          reject(new Error(`"${file.name}": La resolucion minima es ${MIN_RESOLUTION}x${MIN_RESOLUTION} pixeles.`))
        } else {
          resolve()
        }
      }
      img.onerror = () => reject(new Error(`"${file.name}": No se pudo validar la imagen.`))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error(`"${file.name}": No se pudo leer el archivo.`))
    reader.readAsDataURL(file)
  })
}

// ─── SUBCOMPONENTE: FILA DE VARIANTE ───
function VariantRow({ v, onChange, onRemove }) {
  const color = colorFor(v.color)
  const hex = color ? color.hex : (v.color_hex || '#6B7280')
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8,
      padding: '8px 12px', background: 'var(--color-bg-tertiary)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{ flex: 1 }}>
        <label style={labelSm}>Talla</label>
        <select value={v.size} onChange={e => onChange({ ...v, size: e.target.value })} style={inputStyle}>
          <option value="">Seleccionar talla</option>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label style={labelSm}>Color</label>
        <select
          value={color ? color.value : (v.color || '')}
          onChange={e => {
            const selected = COLOR_OPTIONS.find(c => c.value === e.target.value)
            if (!selected) return
            onChange({ ...v, color: selected.value, color_hex: selected.hex, color_nombre: selected.value })
          }}
          style={inputStyle}
        >
          <option value="">Seleccionar color</option>
          {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
        </select>
      </div>
      <div style={{ width: 96 }}>
        <label style={labelSm}>Precio (COP)</label>
        <input
          type="number" min="50" max={PRICE_MAX} step="50" placeholder="Vacío = base"
          value={v.price_variant ?? ''}
          onChange={e => onChange({ ...v, price_variant: e.target.value === '' ? null : Number(e.target.value) })}
          style={inputStyle}
          onWheel={e => e.target.blur()}
        />
      </div>
      <div style={{ width: 90 }}>
        <label style={labelSm}>Stock</label>
        <input
          type="number" min="0" placeholder="Stock"
          value={v.stock}
          onChange={e => {
            const val = Number(e.target.value)
            if (val >= 0) onChange({ ...v, stock: val })
          }}
          style={inputStyle}
          onWheel={e => e.target.blur()}
        />
      </div>
      <div style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--color-border)', background: hex, flexShrink: 0, marginBottom: 1 }} title={v.color || ''} />
      <button type="button" onClick={onRemove} className="btn btn-sm btn-ghost" style={{ color: 'var(--color-error)', marginBottom: 1 }}>
        Eliminar
      </button>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ───

/**
 * Extrae los ids de categoría de un producto, tolerando que la lista falte.
 *
 * `categories` la arma productService.fetchMicroProductAdmin y siempre llega
 * como array, pero normalizar acá evita que un shape raro reviente el render
 * con "Cannot read properties of undefined (reading 'map')".
 */
function categoryIdsOf(product) {
  return (product?.categories || []).map(c => c.id)
}

export default function ProductForm({ product, onClose, onSaved }) {
  const isEditing = Boolean(product)

  const [name, setName] = useState(() => product?.name || '')
  const [description, setDescription] = useState(() => product?.description || '')
  const [price, setPrice] = useState(() => product?.base_price ?? '')
  const [referencia, setReferencia] = useState(() => product?.sku || '')
  const [isActive, setIsActive] = useState(() => product?.is_active ?? true)
  const [mainImage, setMainImageFile] = useState(null)
  const [imageItems, setImageItems] = useState(() => (product?.images || []).slice().sort((a, b) => a.order - b.order))
  const [deletedImageIds, setDeletedImageIds] = useState([])
  const [createdImageIds, setCreatedImageIds] = useState([])
  const [pendingMainImageId, setPendingMainImageId] = useState(null)
  const [existingVariants, setExistingVariants] = useState(() => (product?.variants || []).map(v => ({ ...v, _dirty: false })))
  const [removedVariantIds, setRemovedVariantIds] = useState([])
  const [variants, setVariants] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  // ── CATEGORÍAS: dos estados, no uno ───────────────────────────────────
  // categoryIds  → lo que el usuario marcó AHORA (se envía al guardar).
  // initialCategoryIds → lo que tenía el producto AL ABRIR el formulario.
  // La diferencia entre ambos es lo que permite decidir si hace falta
  // llamar a Django: si no cambió, se evita el PATCH (que además bumpea la
  // columna `version`, ver Product.save() en Django).
  const idsFromProduct = categoryIdsOf(product)
  const [categoryIds, setCategoryIds] = useState(idsFromProduct)
  const [initialCategoryIds, setInitialCategoryIds] = useState(idsFromProduct)
  const [saving, setSaving] = useState(false)

  // El inicializador de useState sólo corre en el PRIMER montaje. Si la prop
  // `product` llegara después (o cambiara), categoryIds se quedaría congelado
  // en [] y el formulario abriría sin ninguna categoría marcada aunque el
  // producto sí las tenga. Este efecto es el que cubre ese caso.
  //
  // La dependencia es `product?.id` y no `product` a propósito: AdminProductDetail
  // vuelve a pedir el producto con cada cambio de estado, y depender del objeto
  // reiniciaría los checkboxes bajo los dedos del usuario. Lo que importa es
  // que esté ABRIENDO un producto distinto, no que el mismo llegue con otro
  // objeto.
  useEffect(() => {
    const ids = categoryIdsOf(product)
    setCategoryIds(ids)
    setInitialCategoryIds(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  // Catálogo de categorías para los checkboxes. Va a Django: es el único
  // backend que tiene el modelo Category.
  useEffect(() => {
    fetchCategories()
      .then(data => setCategoryOptions(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
  }, [])

  function toggleCategory(id) {
    setCategoryIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  function categoriesChanged() {
    if (categoryIds.length !== initialCategoryIds.length) return true
    return categoryIds.some(id => !initialCategoryIds.includes(id))
  }

  function addVariant() {
    setVariants(vs => [...vs, { size: '', color: '', color_hex: '', color_nombre: '', stock: 0, price_variant: null }])
  }

  // ─── OPERACIONES DE IMAGEN (Solo estado local, se ejecutan en submit) ───

  function removeImage(imageId) {
    setDeletedImageIds(ids => [...ids, imageId])
    setImageItems(items => items.filter(img => img.id !== imageId))
  }

  function markImageAsMain(imageId) {
    setPendingMainImageId(imageId)
    setImageItems(items => items.map(img => ({ ...img, is_main: img.id === imageId })))
  }

  function moveImage(index, direction) {
    const next = imageItems.slice()
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= next.length) return
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    setImageItems(next)
  }

  // Sube las imágenes adicionales al instante y las agrega al final de la
  // lista del gestor para poder reordenarlas de inmediato.
  async function handleAddImages(files) {
    const storedCount = imageItems.length + deletedImageIds.length
    if (storedCount >= MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes por producto.`)
      return
    }
    for (const file of Array.from(files || [])) {
      try {
        await validateImageFile(file)
      } catch (e) {
        toast.error(e.message)
        continue
      }
      try {
        const form = new FormData()
        form.append('image', file)
        form.append('is_main', 'false')
        const created = await createProductImage(product.id, form)
        setImageItems(items => [...items, created])
        setCreatedImageIds(ids => [...ids, created.id])
      } catch (e) {
        toast.error(errMsg(e, `No se pudo subir "${file.name}"`))
      }
    }
  }

  // Cancelar también revierte las imágenes subidas en esta sesión.
  async function handleCancel() {
    if (saving) return
    if (createdImageIds.length > 0) {
      await Promise.allSettled(
        createdImageIds.map(id => deleteProductImage(product.id, id).catch(() => {}))
      )
    }
    onClose()
  }

  // ─── VALIDACIÓN COMPLETA (refleja TODAS las reglas del backend) ───
  function validate() {
    // --- Producto ---
    if (!name.trim()) return 'El nombre es requerido.'
    if (name.trim().length > 100) return 'El nombre no puede superar 100 caracteres.'
    if (!description.trim()) return 'La descripción es requerida.'
    if (description.trim().length > 500) return 'La descripción no puede superar 500 caracteres.'
    if (!isValidCopPrice(price)) return `El precio base debe ser un múltiplo de 50 COP (mínimo $50, máximo ${priceMaxLabel}).`
    if (!referencia.trim()) return 'La referencia (SKU) es requerida.'
    if (referencia.trim().length < 3 || referencia.trim().length > 20) return 'La referencia debe tener entre 3 y 20 caracteres.'
    if (!/^[A-Z0-9-]{3,20}$/.test(referencia.trim())) return 'La referencia solo puede contener letras mayúsculas, números y guiones.'

    // --- Imágenes (crear) ---
    if (!isEditing && !mainImage) return 'La imagen principal es requerida.'

    // --- Imágenes (editar): max 5 total ---
    if (isEditing) {
      const totalImages = imageItems.length + deletedImageIds.length
      if (totalImages > MAX_IMAGES) return `Máximo ${MAX_IMAGES} imágenes por producto (actualmente ${totalImages}).`
      if (imageItems.length === 0 && !mainImage) {
        return 'El producto debe tener al menos una imagen.'
      }
    }

    // --- Variantes (crear) ---
    if (!isEditing && variants.length === 0) return 'Agregar al menos una variante.'

    // --- Validar todas las variantes (existentes + nuevas) ---
    const allVariants = [...existingVariants, ...variants]
    const sizes = new Set()
    const colors = new Set()
    const combos = new Set()

    for (const v of allVariants) {
      const label = `Variante "${v.size || '?'}/${v.color || '?'}"`

      if (!v.size || !v.size.trim()) return `${label}: La talla es requerida.`
      if (v.size.trim().length > 20) return `${label}: La talla no puede superar 20 caracteres.`

      if (!v.color || !v.color.trim()) return `${label}: El color es requerido.`
      if (v.color.trim().length > 20) return `${label}: El color no puede superar 20 caracteres.`

      if (v.stock < 0) return `${label}: El stock no puede ser negativo.`

      if (v.price_variant != null && v.price_variant !== '' && !isValidCopPrice(v.price_variant)) {
        return `${label}: El precio de variante debe ser múltiplo de 50 COP (mínimo $50, máximo ${priceMaxLabel}).`
      }

      // color_hex validation
      const hex = v.color_hex || (colorFor(v.color)?.hex || '')
      if (hex && !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        return `${label}: El color HEX debe tener formato #RRGGBB.`
      }

      sizes.add(v.size.trim().toLowerCase())
      colors.add(v.color.trim().toLowerCase())
      const combo = `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`
      if (combos.has(combo)) return `Cada combinación talla/color debe ser única por producto.`
      combos.add(combo)
    }

    if (sizes.size > MAX_SIZES_PER_PRODUCT) return `Máximo ${MAX_SIZES_PER_PRODUCT} tallas diferentes por producto.`
    if (colors.size > MAX_COLORS_PER_PRODUCT) return `Máximo ${MAX_COLORS_PER_PRODUCT} colores diferentes por producto.`

    return null
  }

  async function validateAllImages() {
    if (mainImage) await validateImageFile(mainImage)
  }

  // ─── HANDLER DE ENVÍO ────────────────────────────────────────────────
  // Orchestrador de los dos flujos. Ver el docstring de este archivo para el
  // detalle paso a paso de "crear" y "editar".
  //
  // Dos ideas guían el orden:
  //  1. PRIMERO BORRAR, DESPUÉS ACTUALIZAR. Al revés, un fallo dejaría
  //     imágenes/variantes eliminadas de un producto que no se guardó.
  //  2. SPRING ANTES QUE DJANGO EN EL PUT. Product.save() en Django bumpea
  //     `version`; si Django escribiera primero, el PUT de Spring llegaría con
  //     la versión obsoleta y respondería 409 sin guardar nada.
  async function handleSubmit(e) {
    e.preventDefault()

    // Paso 0: Validación client-side completa
    const error = validate()
    if (error) return toast.error(error)

    setSaving(true)
    const createdIds = { productId: null, imageIds: [], variantIds: [] }

    try {
      // Paso 1: Validar imágenes client-side
      await validateAllImages()

      let savedProduct = product
      // Payload para el microservicio Spring Boot.
      //
      // `category_ids` NO va acá: ProductoRequest (el DTO de Spring) no tiene
      // ese campo, así que mandarlo sería descartarlo en silencio. Las
      // categorías viajan aparte, a Django, con syncProductCategories() en los
      // pasos 1b / 2b. Ver el comentario de cada paso para el porqué del orden.
      const basePayload = {
        name: name.trim(),
        description: description.trim(),
        base_price: Number(price),
        referencia: referencia.trim(),
        is_active: isActive,
        // Versión con la que se ABRIÓ el formulario, no la vigente: es la
        // única que permite detectar que otro usuario guardó mientras este
        // modal estaba abierto (si se mandara la actual, nunca habría 409).
        version: product?.version,
      }

      if (isEditing) {
        // ─── FLUJO EDITAR ───
        // Paso 1: Eliminar imágenes marcadas (idempotente: si ya no existe, ok)
        for (const imageId of deletedImageIds) {
          await deleteProductImage(product.id, imageId).catch(e => {
            if (e?.response?.status !== 404) throw e
          })
        }
        setDeletedImageIds([])

        // Paso 2: Actualizar datos del producto (vía microservicio)
        //   PUT /api/v1/productos/{id} → ProductoController.actualizarProducto
        //   → ProductoServiceImpl.actualizarProducto → JPA save() → 200
        savedProduct = await updateMicroProduct(product.id, basePayload)

        // Paso 2b: Sincronizar categorías (vía Django, si cambiaron).
        //   PATCH /api/products/{id}/ con { category_ids }
        //   → ProductWriteSerializer._set_categories() → replace en
        //     products_productcategory.
        //
        // Va DESPUÉS del PUT de Spring a propósito. Product.save() en Django
        // incrementa `version` con F('version') + 1, así que si Django
        // escribiera primero, el PUT de Spring llegaría con una versión ya
        // obsoleta y respondería 409 sin guardar nada. En este orden el PUT
        // usa la versión con la que se abrió el formulario y el PATCH no
        // invalida nada de lo que el usuario está viendo.
        //
        // Sólo se llama si el usuario realmente desmarcó/marcó algo: el PATCH
        // es una escritura extra y no está gratis.
        if (categoriesChanged()) {
          await syncProductCategories(savedProduct.id, categoryIds)
        }

        // Paso 3: Guardar variantes existentes
        for (const variant of existingVariants) {
          await updateProductVariant(savedProduct.id, variant.id, {
            size: variant.size.trim(),
            color: variant.color.trim(),
            color_hex: variant.color_hex || (colorFor(variant.color)?.hex || '#6B7280'),
            color_nombre: variant.color_nombre || variant.color,
            stock: variant.stock,
            price_variant: variant.price_variant,
          })
        }

        // Paso 4: Eliminar variantes marcadas
        for (const variantId of removedVariantIds) {
          await deleteProductVariant(savedProduct.id, variantId)
        }

        // Paso 5: Crear variantes nuevas
        for (const variant of variants) {
          if (!variant.size || !variant.color) continue
          const created = await createProductVariant(savedProduct.id, {
            size: variant.size.trim(),
            color: variant.color.trim(),
            color_hex: variant.color_hex || (colorFor(variant.color)?.hex || '#6B7280'),
            color_nombre: variant.color_nombre || variant.color,
            stock: variant.stock,
            price_variant: variant.price_variant,
          })
          createdIds.variantIds.push(created.id)
        }

        // Paso 7: Marcar imagen principal si cambió
        if (pendingMainImageId) {
          await updateProductImage(savedProduct.id, pendingMainImageId, { is_main: true })
        }

        // Paso 8: Reordenar imágenes (la lista ya incluye las subidas)
        const nextImages = imageItems.slice()
        if (nextImages.length > 0) {
          await reorderProductImages(savedProduct.id, nextImages.map((img, i) => ({ id: img.id, order: i + 1 })))
        }

        // Imágenes subidas en esta sesión quedan confirmadas
        setCreatedImageIds([])
      } else {
        // ─── FLUJO CREAR ───
        // Paso 1: Crear producto (vía microservicio)
        //   POST /api/v1/productos → ProductoController.crearProducto
        //   → ProductoServiceImpl.crearProducto → JPA save() → 201
        savedProduct = await createMicroProduct(basePayload)
        createdIds.productId = savedProduct.id

        // Paso 1b: Asociar las categorías (vía Django, si se marcó alguna).
        //   Spring acaba de crear la fila, pero la tabla
        //   products_productcategory es de Django: sin este paso el producto
        //   nacía sin categorías aunque el usuario las hubiera elegido.
        if (categoryIds.length > 0) {
          await syncProductCategories(savedProduct.id, categoryIds)
        }

        // Paso 2: Subir imagen principal
        const mainForm = new FormData()
        mainForm.append('image', mainImage)
        mainForm.append('is_main', 'true')
        const createdMainImg = await createProductImage(savedProduct.id, mainForm)
        createdIds.imageIds.push(createdMainImg.id)

        // Paso 3: Crear variantes
        for (const variant of variants) {
          if (!variant.size || !variant.color) continue
          const created = await createProductVariant(savedProduct.id, {
            size: variant.size.trim(),
            color: variant.color.trim(),
            color_hex: variant.color_hex || (colorFor(variant.color)?.hex || '#6B7280'),
            color_nombre: variant.color_nombre || variant.color,
            stock: variant.stock,
            price_variant: variant.price_variant,
          })
          createdIds.variantIds.push(created.id)
        }
      }

      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado')
      onSaved && onSaved()
    } catch (err) {
      // ─── CONFLICTO DE VERSIÓN (409): otro usuario editó el producto ───
      // No es un error de validación: los datos pueden estar bien, pero la
      // versión que tenía el formulario quedó vieja. Se cierra el modal y se
      // refresca la lista en vez de reintentar: reintentar a ciegas leería la
      // versión nueva y sobrescribiría el trabajo ajeno, que es justo lo que
      // el bloqueo optimista existe para evitar.
      if (err?.response?.status === 409) {
        toast.error(
          'El producto fue modificado por otro usuario. ' +
          'Recargá el formulario para ver los cambios más recientes.',
          { duration: 6000 },
        )
        onSaved && onSaved()
        onClose()
        return
      }

      // ─── ROLLBACK: Si se creó algo, eliminarlo ───
      if (createdIds.productId) {
        await Promise.all(
          createdIds.imageIds.map(imageId =>
            deleteProductImage(createdIds.productId, imageId).catch(() => {}),
          ),
        )
        try {
          await deleteMicroProduct(createdIds.productId)
        } catch { /* ignorar error de rollback */ }
      }
      toast.error(errMsg(err, 'Error al guardar'))
    } finally {
      setSaving(false)
    }
  }

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
    marginBottom: 6,
  }

    return (
    <div className="form-modal-backdrop" onClick={handleCancel}>
      <div className="form-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(860px, 95vw)' }}>
        {/* ─── CABECERA DEL MODAL ─── */}
        <div className="form-modal-header">
          <h2>{isEditing ? 'Editar Producto' : 'Crear Producto'}</h2>
          <button className="form-modal-close" onClick={handleCancel}>✕</button>
        </div>

        {/* ─── CUERPO DEL FORMULARIO ─── */}
        <form onSubmit={handleSubmit} className="form-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label style={labelStyle}>Nombre</label>
              <input style={{ ...inputStyle, fontSize: 14 }} value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Nombre del producto" />
              <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{name.length}/100 caracteres</small>
            </div>
            <div className="form-group">
              <label style={labelStyle}>Precio base (COP)</label>
              <input style={{ ...inputStyle, fontSize: 14 }} type="number" value={price} onChange={e => setPrice(e.target.value)} min="50" max={PRICE_MAX} step="50" placeholder="Múltiplo de 50" />
              <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Mínimo $50 COP, máximo ${priceMaxLabel}, múltiplo de 50.</small>
            </div>
            <div className="form-group">
              <label style={labelStyle}>Referencia (SKU)</label>
              <input style={{ ...inputStyle, fontSize: 14 }} value={referencia} onChange={e => setReferencia(e.target.value.toUpperCase())} maxLength={20} placeholder="Ej: RED-CAM-01" />
              <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>3-20 caracteres, alfanumérico mayúsculas.</small>
            </div>
          </div>

          <div className="form-group">
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, fontSize: 14, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="Descripción del producto" />
            <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{description.length}/500 caracteres</small>
          </div>

          <div className="form-group">
            <label style={labelStyle}>Categorías</label>
            {categoryOptions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>No hay categorías disponibles.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categoryOptions.map(cat => (
                  <label key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: `1px solid ${categoryIds.includes(cat.id) ? 'var(--color-primary)' : 'var(--color-border)'}`, background: categoryIds.includes(cat.id) ? 'var(--color-primary)' : 'var(--color-bg)', color: categoryIds.includes(cat.id) ? '#fff' : 'var(--color-text)' }}>
                    <input type="checkbox" checked={categoryIds.includes(cat.id)} onChange={() => toggleCategory(cat.id)} style={{ display: 'none' }} />
                    {cat.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <label style={{ ...labelStyle, margin: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 16, height: 16 }} />
                Producto activo
              </label>
            </div>
          )}

          {!isEditing && (
            <div className="form-group">
              <label style={labelStyle}>Imagen principal</label>
              <input type="file" accept="image/png, image/jpeg" onChange={e => setMainImageFile(e.target.files[0])} style={inputStyle} />
            </div>
          )}

          {isEditing && (
            <div className="form-group">
              <label style={labelStyle}>Agregar imágenes adicionales</label>
              <input
                type="file" multiple accept="image/png, image/jpeg, image/webp"
                onChange={e => {
                  handleAddImages(e.target.files)
                  e.target.value = ''
                }}
                style={inputStyle}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                Max {MAX_IMAGES} imagenes, JPG/PNG/WebP, max 2MB, min 400x400px. ({imageItems.length}/{MAX_IMAGES})
              </small>
            </div>
          )}

          {isEditing && imageItems.length > 0 && (
            <div className="form-group">
              <label style={labelStyle}>Gestión de imágenes ({imageItems.length} restante(s))</label>
              <div style={{ display: 'grid', gap: 10 }}>
                {imageItems.map((image, index) => (
                  <div key={image.id} style={{
                    display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 12,
                    alignItems: 'center', padding: 12,
                    background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border-light)',
                  }}>
                    <img
                      src={image.image_url} alt=""
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                    />
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        Orden: {image.order} {image.is_main ? '· Principal' : '· Secundaria'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-xs btn-secondary" onClick={() => moveImage(index, -1)} disabled={index === 0}>↑</button>
                      <button type="button" className="btn btn-xs btn-secondary" onClick={() => moveImage(index, 1)} disabled={index === imageItems.length - 1}>↓</button>
                      {!image.is_main && (
                        <button type="button" className="btn btn-xs btn-secondary" onClick={() => markImageAsMain(image.id)}>Principal</button>
                      )}
                      <button type="button" className="btn btn-xs btn-ghost" onClick={() => removeImage(image.id)} style={{ color: 'var(--color-error)' }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
              {(deletedImageIds.length > 0 || pendingMainImageId) && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Los cambios de imagen se aplicarán al guardar.
                </p>
              )}
            </div>
          )}

          {/* ─── SECCIÓN DE VARIANTES ─── */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={labelStyle}>Variantes</label>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addVariant}>
                + Agregar variante
              </button>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-muted)' }}>
              Cada combinación de talla y color es una variante con su propio stock y precio opcional (COP). Max {MAX_SIZES_PER_PRODUCT} tallas, {MAX_COLORS_PER_PRODUCT} colores.
            </p>

            {existingVariants.length > 0 && (
              <div style={{
                padding: '10px 14px', background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-lg)', marginBottom: 8,
                border: '1px dashed var(--color-border)',
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Variantes existentes ({existingVariants.length}) — edita stock/precio o elimina
                </p>
                {existingVariants.map(v => (
                  <VariantRow
                    key={v.id}
                    v={v}
                    onChange={nv => setExistingVariants(a => a.map(x => x.id === v.id ? nv : x))}
                    onRemove={() => {
                      setRemovedVariantIds(ids => [...ids, v.id])
                      setExistingVariants(a => a.filter(x => x.id !== v.id))
                    }}
                  />
                ))}
              </div>
            )}

            {removedVariantIds.length > 0 && (
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-error)' }}>
                {removedVariantIds.length} variante(s) se eliminarán al guardar.
              </p>
            )}

            {variants.map((v, idx) => (
              <VariantRow
                key={idx}
                v={v}
                onChange={nv => setVariants(a => a.map((x, i) => i === idx ? nv : x))}
                onRemove={() => setVariants(a => a.filter((_, i) => i !== idx))}
              />
            ))}
            {variants.length === 0 && existingVariants.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                No hay variantes. Haz clic en "+ Agregar variante" para añadir una.
              </p>
            )}
          </div>

          {/* ─── PIE DEL MODAL: BOTONES ─── */}
          <div className="form-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Guardar Producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
