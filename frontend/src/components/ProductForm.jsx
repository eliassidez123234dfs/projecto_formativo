import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchCategories,
  createProduct,
  updateProduct,
  createProductImage,
  updateProductImage,
  deleteProductImage,
  reorderProductImages,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from '../services/api'

function errMsg(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  return Object.values(data).flat().join(' | ') || fallback
}

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

function isValidCopPrice(value) {
  const n = Number(value)
  return Number.isFinite(n) && Number.isInteger(n) && n >= 50 && n % 50 === 0
}

function colorFor(value) {
  return COLOR_OPTIONS.find(c => c.value.toLowerCase() === String(value).toLowerCase())
}

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
          type="number" min="50" step="50" placeholder="Vacío = base"
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

/**
 * Componente principal del formulario de producto.
 * @param {{ product?: Object, onClose: Function, onSaved: Function }}
 */
export default function ProductForm({ product, onClose, onSaved }) {
  const isEditing = Boolean(product)

  const [name, setName] = useState(() => product?.name || '')
  const [description, setDescription] = useState(() => product?.description || '')
  const [price, setPrice] = useState(() => product?.base_price ?? '')
  const [isActive, setIsActive] = useState(() => product?.is_active ?? true)
  const [mainImage, setMainImageFile] = useState(null)
  const [extraImages, setExtraImages] = useState([])
  const [imageItems, setImageItems] = useState(() => (product?.images || []).slice().sort((a, b) => a.order - b.order))
  const [existingVariants, setExistingVariants] = useState(() => (product?.variants || []).map(v => ({ ...v, _dirty: false })))
  const [removedVariantIds, setRemovedVariantIds] = useState([])
  const [variants, setVariants] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [categoryIds, setCategoryIds] = useState(() => (product?.categories || []).map(c => c.id))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCategories()
      .then(data => setCategoryOptions(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
  }, [])

  function toggleCategory(id) {
    setCategoryIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  function addVariant() {
    setVariants(vs => [...vs, { size: '', color: '', color_hex: '', color_nombre: '', stock: 0, price_variant: null }])
  }

  async function patchProduct(payload) {
    return updateProduct(product.id, payload)
  }

  async function createProductRecord() {
    return createProduct({
      name, description, base_price: Number(price), is_active: isActive, category_ids: categoryIds,
    })
  }

  async function uploadMainImage(productId) {
    const form = new FormData()
    form.append('image', mainImage)
    form.append('is_main', 'true')
    return createProductImage(productId, form)
  }

  async function uploadExtraImages(productId) {
    for (const file of extraImages) {
      const form = new FormData()
      form.append('image', file)
      form.append('is_main', 'false')
      await createProductImage(productId, form)
    }
  }

  async function createVariants(productId) {
    for (const variant of variants) {
      if (!variant.size || !variant.color) continue
      await createProductVariant(productId, {
        size: variant.size,
        color: variant.color,
        color_hex: variant.color_hex,
        color_nombre: variant.color_nombre || variant.color,
        stock: variant.stock,
        price_variant: variant.price_variant,
      })
    }
  }

  async function saveExistingVariants(productId) {
    for (const variant of existingVariants) {
      await updateProductVariant(productId, variant.id, {
        size: variant.size,
        color: variant.color,
        color_hex: variant.color_hex || (colorFor(variant.color)?.hex || '#6B7280'),
        color_nombre: variant.color_nombre || variant.color,
        stock: variant.stock,
        price_variant: variant.price_variant,
      })
    }
  }

  async function deleteVariants(productId) {
    for (const variantId of removedVariantIds) {
      await deleteProductVariant(productId, variantId)
    }
  }

  async function reorderImages(nextItems) {
    setImageItems(nextItems)
    if (!isEditing) return
    await reorderProductImages(product.id, nextItems.map((img, i) => ({ id: img.id, order: i + 1 })))
  }

  async function markImageAsMain(imageId) {
    if (!isEditing) return
    await updateProductImage(product.id, imageId, { is_main: true })
    setImageItems(items => items.map(img => ({ ...img, is_main: img.id === imageId })))
  }

  async function removeImage(imageId) {
    if (!isEditing) return
    await deleteProductImage(product.id, imageId)
    setImageItems(items => items.filter(img => img.id !== imageId))
  }

  function validate() {
    if (!name.trim()) return 'Nombre requerido'
    if (!description.trim()) return 'Descripción requerida'
    if (!isValidCopPrice(price)) return 'El precio base en COP debe ser >= 50 y múltiplo de 50'
    for (const v of [...existingVariants, ...variants]) {
      if (v.price_variant != null && v.price_variant !== '' && !isValidCopPrice(v.price_variant)) {
        return `El precio de la variante "${v.size || '?'}/${v.color || '?'}" debe ser >= 50 y múltiplo de 50, o dejarse vacío`
      }
    }
    if (!isEditing && !mainImage) return 'Imagen principal requerida'
    if (!isEditing && variants.length === 0) return 'Agregar al menos una variante'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const error = validate()
    if (error) return toast.error(error)

    setSaving(true)
    try {
      let savedProduct = product
      const basePayload = {
        name, description, base_price: Number(price), is_active: isActive, category_ids: categoryIds,
      }
      if (isEditing) {
        savedProduct = await patchProduct(basePayload)
        await saveExistingVariants(savedProduct.id)
        await deleteVariants(savedProduct.id)
      } else {
        savedProduct = await createProductRecord()
        await uploadMainImage(savedProduct.id)
        await createVariants(savedProduct.id)
      }

      if (isEditing && variants.length > 0) await createVariants(savedProduct.id)
      if (isEditing && extraImages.length > 0) await uploadExtraImages(savedProduct.id)

      if (isEditing) {
        const nextImages = imageItems.slice().sort((a, b) => a.order - b.order)
        await reorderImages(nextImages)
      }

      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado')
      onSaved && onSaved()
    } catch (err) {
      toast.error(errMsg(err, 'Error'))
    } finally {
      setSaving(false)
    }
  }

  function moveImage(index, direction) {
    const next = imageItems.slice()
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= next.length) return
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    reorderImages(next).catch(err => toast.error(err.message))
  }

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
    marginBottom: 6,
  }

  return (
    <div className="form-modal-backdrop" onClick={onClose}>
      <div className="form-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(860px, 95vw)' }}>
        <div className="form-modal-header">
          <h2>{isEditing ? 'Editar Producto' : 'Crear Producto'}</h2>
          <button className="form-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="form-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label style={labelStyle}>Nombre</label>
              <input style={{ ...inputStyle, fontSize: 14 }} value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Nombre del producto" />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Precio base (COP)</label>
              <input style={{ ...inputStyle, fontSize: 14 }} type="number" value={price} onChange={e => setPrice(e.target.value)} min="50" step="50" placeholder="Múltiplo de 50" />
              <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Mínimo $50 COP, múltiplo de 50.</small>
            </div>
          </div>

          <div className="form-group">
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, fontSize: 14, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="Descripción del producto" />
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
              <input type="file" multiple accept="image/png, image/jpeg" onChange={e => setExtraImages(Array.from(e.target.files || []))} style={inputStyle} />
            </div>
          )}

          {isEditing && imageItems.length > 0 && (
            <div className="form-group">
              <label style={labelStyle}>Gestión de imágenes</label>
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
            </div>
          )}

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={labelStyle}>Variantes</label>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addVariant}>
                + Agregar variante
              </button>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-muted)' }}>
              Cada combinación de talla y color es una variante con su propio stock y precio opcional (COP).
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

          <div className="form-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
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
