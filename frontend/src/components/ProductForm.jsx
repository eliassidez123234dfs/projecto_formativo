/**
 * ProductForm — Formulario modal para crear y editar productos (admin).
 * Incluye campos de nombre, descripción, precio base, estado activo,
 * gestión de imágenes (principal y adicionales con reordenamiento),
 * y variantes (talla, color, stock). Soporta modo creación y edición.
 */
import { useState } from 'react'
import toast from 'react-hot-toast'

/**
 * Intenta parsear la respuesta JSON de forma segura; retorna null si falla.
 * @param {Response} res
 * @returns {Promise<Object|null>}
 */
async function safeJson(res) {
  try { return await res.json() } catch { return null }
}

/**
 * Fila de edición de una variante individual (talla, color, stock).
 * @param {{ v: Object, onChange: Function, onRemove: Function }}
 */
function VariantRow({ v, onChange, onRemove }) {
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'Único']
const COLORS = ['Rojo', 'Azul', 'Negro', 'Blanco', 'Gris', 'Verde', 'Amarillo', 'Naranja', 'Rosa', 'Morado', 'Marrón', 'Beige', 'Plateado', 'Dorado']
const selectStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)', background: 'var(--color-bg)',
  color: 'var(--color-text)', fontSize: 13, outline: 'none',
}
const labelSm = { fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 2 }
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8,
      padding: '8px 12px', background: 'var(--color-bg-tertiary)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{ flex: 1 }}>
        <label style={labelSm}>Talla</label>
        <select value={v.size} onChange={e => onChange({ ...v, size: e.target.value })} style={selectStyle}>
          <option value="">Seleccionar talla</option>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label style={labelSm}>Color</label>
        <select value={v.color} onChange={e => onChange({ ...v, color: e.target.value })} style={selectStyle}>
          <option value="">Seleccionar color</option>
          {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
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
          style={{
            width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', background: 'var(--color-bg)',
            color: 'var(--color-text)', fontSize: 13, outline: 'none',
          }}
          onWheel={e => e.target.blur()}
        />
      </div>
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
  const [variants, setVariants] = useState([])
  const currentVariants = product?.variants || []
  const [saving, setSaving] = useState(false)

  function addVariant() {
    setVariants(vs => [...vs, { size: '', color: '', stock: 0 }])
  }

  async function patchProduct(payload) {
    const response = await fetch(`/api/products/${product.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await safeJson(response)
    if (!response.ok) throw new Error(data ? Object.values(data).flat().join(' | ') : 'Error actualizando producto')
    return data
  }

  async function createProduct() {
    const response = await fetch('/api/products/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, base_price: Number(price), is_active: isActive }),
    })
    const data = await safeJson(response)
    if (!response.ok) throw new Error(data ? Object.values(data).flat().join(' | ') : 'Error creando producto')
    return data
  }

  async function uploadMainImage(productId) {
    const form = new FormData()
    form.append('image', mainImage)
    form.append('is_main', 'true')
    const response = await fetch(`/api/products/${productId}/images/`, { method: 'POST', body: form })
    const data = await safeJson(response)
    if (!response.ok) throw new Error(data ? Object.values(data).flat().join(' | ') : 'Error subiendo imagen')
    return data
  }

  async function uploadExtraImages(productId) {
    for (const file of extraImages) {
      const form = new FormData()
      form.append('image', file)
      form.append('is_main', 'false')
      const response = await fetch(`/api/products/${productId}/images/`, { method: 'POST', body: form })
      if (!response.ok) {
        const data = await safeJson(response)
        throw new Error(data ? Object.values(data).flat().join(' | ') : 'Error subiendo imágenes')
      }
    }
  }

  async function uploadVariants(productId) {
    for (const variant of variants) {
      if (!variant.size || !variant.color) continue
      const response = await fetch(`/api/products/${productId}/variants/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variant),
      })
      if (!response.ok) {
        const data = await safeJson(response)
        throw new Error(data ? Object.values(data).flat().join(' | ') : 'Error creando variantes')
      }
    }
  }

  async function reorderImages(nextItems) {
    setImageItems(nextItems)
    if (!isEditing) return
    await fetch(`/api/products/${product.id}/images/reorder/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: nextItems.map((img, i) => ({ id: img.id, order: i + 1 })) }),
    })
  }

  async function markImageAsMain(imageId) {
    if (!isEditing) return
    await fetch(`/api/products/${product.id}/images/${imageId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_main: true }),
    })
    setImageItems(items => items.map(img => ({ ...img, is_main: img.id === imageId })))
  }

  async function removeImage(imageId) {
    if (!isEditing) return
    await fetch(`/api/products/${product.id}/images/${imageId}/`, { method: 'DELETE' })
    setImageItems(items => items.filter(img => img.id !== imageId))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!name.trim()) return toast.error('Nombre requerido')
    if (!description.trim()) return toast.error('Descripción requerida')
    if (!price || Number(price) <= 0) return toast.error('Precio inválido')
    if (!isEditing && !mainImage) return toast.error('Imagen principal requerida')
    if (!isEditing && variants.length === 0) return toast.error('Agregar al menos una variante')

    setSaving(true)
    try {
      let savedProduct = product
      if (isEditing) {
        savedProduct = await patchProduct({ name, description, base_price: Number(price), is_active: isActive })
      } else {
        savedProduct = await createProduct()
        await uploadMainImage(savedProduct.id)
        await uploadVariants(savedProduct.id)
      }

      if (isEditing && variants.length > 0) await uploadVariants(savedProduct.id)
      if (isEditing && extraImages.length > 0) await uploadExtraImages(savedProduct.id)

      if (isEditing) {
        const nextImages = imageItems.slice().sort((a, b) => a.order - b.order)
        await reorderImages(nextImages)
      }

      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado')
      onSaved && onSaved()
    } catch (err) {
      toast.error(err.message || 'Error')
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

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)',
    color: 'var(--color-text)', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s',
  }

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
    marginBottom: 6,
  }

  return (
    <div className="form-modal-backdrop" onClick={onClose}>
      <div className="form-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(820px, 95vw)' }}>
        <div className="form-modal-header">
          <h2>{isEditing ? 'Editar Producto' : 'Crear Producto'}</h2>
          <button className="form-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="form-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label style={labelStyle}>Nombre</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Nombre del producto" />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Precio base</label>
              <input style={inputStyle} type="number" value={price} onChange={e => setPrice(e.target.value)} min="0.01" step="0.01" placeholder="0.00" />
            </div>
          </div>

          <div className="form-group">
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="Descripción del producto" />
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
              Define las variantes del producto: cada combinación de talla y color es una variante con su propio stock.
            </p>

            {currentVariants.length > 0 && (
              <div style={{
                padding: '10px 14px', background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-lg)', marginBottom: 8,
                border: '1px dashed var(--color-border)',
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Variantes existentes ({currentVariants.length})
                </p>
                {currentVariants.map(v => (
                  <p key={v.id} style={{ margin: '2px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {v.size} / {v.color} — Stock: {v.stock}
                  </p>
                ))}
              </div>
            )}

            {variants.map((v, idx) => (
              <VariantRow
                key={idx}
                v={v}
                onChange={nv => setVariants(a => a.map((x, i) => i === idx ? nv : x))}
                onRemove={() => setVariants(a => a.filter((_, i) => i !== idx))}
              />
            ))}
            {variants.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                No hay variantes nuevas. Haz clic en "+ Agregar variante" para añadir una.
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
