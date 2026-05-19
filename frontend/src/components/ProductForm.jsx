import { useState } from 'react'

function VariantRow({ v, onChange, onRemove }) {
  return (
    <div className="variant-row">
      <input placeholder="Talla" value={v.size} onChange={e => onChange({ ...v, size: e.target.value })} />
      <input placeholder="Color" value={v.color} onChange={e => onChange({ ...v, color: e.target.value })} />
      <input type="number" min="0" placeholder="Stock" value={v.stock} onChange={e => onChange({ ...v, stock: Number(e.target.value) })} />
      <button type="button" onClick={onRemove}>Eliminar</button>
    </div>
  )
}

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
  const [error, setError] = useState(null)

  function addVariant() {
    setVariants(vs => [...vs, { size: '', color: '', stock: 0 }])
  }

  async function patchProduct(payload) {
    const response = await fetch(`/api/products/${product.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(Object.values(data).flat().join(' | ') || 'Error actualizando producto')
    }
    return data
  }

  async function createProduct() {
    const response = await fetch('/api/products/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        base_price: Number(price),
        is_active: isActive,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(Object.values(data).flat().join(' | ') || 'Error creando producto')
    }
    return data
  }

  async function uploadMainImage(productId) {
    const form = new FormData()
    form.append('image', mainImage)
    form.append('is_main', 'true')
    const response = await fetch(`/api/products/${productId}/images/`, {
      method: 'POST',
      body: form,
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(Object.values(data).flat().join(' | ') || 'Error subiendo imagen')
    }
    return data
  }

  async function uploadExtraImages(productId) {
    for (const file of extraImages) {
      const form = new FormData()
      form.append('image', file)
      form.append('is_main', 'false')
      const response = await fetch(`/api/products/${productId}/images/`, {
        method: 'POST',
        body: form,
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(Object.values(data).flat().join(' | ') || 'Error subiendo imágenes adicionales')
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
        const data = await response.json()
        throw new Error(Object.values(data).flat().join(' | ') || 'Error creando variantes')
      }
    }
  }

  async function reorderImages(nextItems) {
    setImageItems(nextItems)
    if (!isEditing) return
    const response = await fetch(`/api/products/${product.id}/images/reorder/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: nextItems.map((image, index) => ({ id: image.id, order: index + 1 })),
      }),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(Object.values(data).flat().join(' | ') || 'Error reordenando imágenes')
    }
  }

  async function markImageAsMain(imageId) {
    if (!isEditing) return
    const response = await fetch(`/api/products/${product.id}/images/${imageId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_main: true }),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(Object.values(data).flat().join(' | ') || 'No se pudo marcar como principal')
    }
    setImageItems(items => items.map(image => ({ ...image, is_main: image.id === imageId })))
  }

  async function removeImage(imageId) {
    if (!isEditing) return
    const response = await fetch(`/api/products/${product.id}/images/${imageId}/`, { method: 'DELETE' })
    if (!response.ok && response.status !== 204) {
      const data = await response.json().catch(() => ({}))
      throw new Error(Object.values(data).flat().join(' | ') || 'No se pudo eliminar la imagen')
    }
    const next = imageItems.filter(image => image.id !== imageId)
    setImageItems(next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Nombre requerido')
    if (!description.trim()) return setError('Descripción requerida')
    if (!price || Number(price) <= 0) return setError('Precio inválido')
    if (!isEditing && !mainImage) return setError('Imagen principal requerida')
    if (!isEditing && variants.length === 0) return setError('Agregar al menos una variante')

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

      if (isEditing) {
        const nextImages = imageItems.slice().sort((a, b) => a.order - b.order)
        await reorderImages(nextImages)
      }

      if (isEditing && variants.length > 0) {
        await uploadVariants(savedProduct.id)
      }

      if (isEditing && extraImages.length > 0) {
        await uploadExtraImages(savedProduct.id)
      }

      onSaved && onSaved()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  function moveImage(index, direction) {
    const next = imageItems.slice()
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= next.length) return
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    reorderImages(next).catch(err => setError(err.message))
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card-large">
        <div className="modal-header">
          <h3>{isEditing ? 'Editar Producto' : 'Crear Producto'}</h3>
          <button type="button" onClick={onClose}>✖</button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <label>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={100} />

          <label>Descripción</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} />

          <label>Precio base</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0.01" step="0.01" />

          {isEditing && (
            <div className="switch-row">
              <label>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Producto activo
              </label>
            </div>
          )}

          {!isEditing && (
            <>
              <label>Imagen principal</label>
              <input type="file" accept="image/png, image/jpeg" onChange={e => setMainImageFile(e.target.files[0])} />
            </>
          )}

          {isEditing && (
            <>
              <label>Agregar imágenes</label>
              <input type="file" multiple accept="image/png, image/jpeg" onChange={e => setExtraImages(Array.from(e.target.files || []))} />
            </>
          )}

          {isEditing && (
            <section className="image-manager">
              <h4>Imágenes del producto</h4>
              <div className="image-manager-list">
                {imageItems.map((image, index) => (
                  <article key={image.id} className="image-manager-item">
                    <img src={image.image_url} alt={`Imagen ${index + 1}`} />
                    <div>
                      <p>Orden: {image.order}</p>
                      <p>{image.is_main ? 'Principal' : 'Secundaria'}</p>
                    </div>
                    <div className="image-manager-actions">
                      <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0}>↑</button>
                      <button type="button" onClick={() => moveImage(index, 1)} disabled={index === imageItems.length - 1}>↓</button>
                      <button type="button" onClick={() => markImageAsMain(image.id)}>Principal</button>
                      <button type="button" onClick={() => removeImage(image.id)}>Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="variants">
            <div className="variants-header">
              <h4>Variantes nuevas</h4>
              <button type="button" onClick={addVariant}>➕ Agregar</button>
            </div>
            {currentVariants.length > 0 && (
              <div className="current-variants">
                <h5>Variantes existentes</h5>
                {currentVariants.map(variant => (
                  <p key={variant.id}>{variant.size} / {variant.color} - Stock: {variant.stock}</p>
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
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit" disabled={saving}>{saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Guardar Producto')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
