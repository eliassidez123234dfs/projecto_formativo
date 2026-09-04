// ---------------------------------------------------------------
// VariantPickerModal.jsx  —  Selección de talla/color/cantidad
// Componente compartido entre ProductCard y Catalog para evitar
// duplicar el modal de variantes (antes pc-modal y vm-card).
//
// Props:
//  - product : producto (puede incluir variants ya cargadas)
//  - onClose : cierra el modal
//  - onAdd   : async (variantId, quantity) => Promise  (agregar al carrito)
// ---------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { fetchProductDetail } from '../services/api'
import { DEFAULT_IMAGE } from '../constants'
import { formatCOP } from '../utils/format'
import '../styles/product-card.css'

export const VariantPickerModal = ({ product, onClose, onAdd }) => {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [size, setSize] = useState(null)
  const [color, setColor] = useState(null)
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const imgSrc = product.image || DEFAULT_IMAGE
  const basePrice = Number(product.min_price ?? product.price ?? product.base_price ?? 0)
  const hasVariedPrice = product.min_price != null && product.max_price != null && Number(product.min_price) !== Number(product.max_price)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const hasVariants = Array.isArray(product.variants) && product.variants.length > 0
        const data = hasVariants ? product : await fetchProductDetail(product.id)
        if (cancelled) return
        const variants = data.variants || []
        setVariants(variants)
        const sizes = [...new Set(variants.filter(v => Number(v.stock) > 0).map(v => v.size).filter(Boolean))]
        setSize(sizes[0] || null)
      } catch {
        if (!cancelled) setError('No se pudieron cargar las variantes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [product])

  const availableSizes = useMemo(
    () => [...new Set(variants.filter(v => Number(v.stock) > 0).map(v => v.size).filter(Boolean))],
    [variants]
  )

  const availableColors = useMemo(
    () => [...new Set(variants.filter(v => v.size === size && Number(v.stock) > 0).map(v => v.color).filter(Boolean))],
    [variants, size]
  )

  const matchedVariant = useMemo(
    () => variants.find(v => v.size === size && v.color === color && Number(v.stock) > 0) || null,
    [variants, size, color]
  )

  const maxStock = matchedVariant ? Number(matchedVariant.stock) || 0 : 0
  const displayPrice = matchedVariant && matchedVariant.price_variant != null
    ? Number(matchedVariant.price_variant)
    : basePrice

  const handleAdd = async () => {
    if (!matchedVariant) return
    setSubmitting(true)
    setError(null)
    try {
      await onAdd(matchedVariant.id, qty)
      onClose()
    } catch (err) {
      setError(err?.message || 'No se pudo agregar al carrito.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pc-modal-overlay" onClick={onClose}>
      <div className="pc-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pc-modal-close" onClick={onClose} aria-label="Cerrar">&times;</button>
        <div className="pc-modal-content">
          <div className="pc-modal-left">
            <img src={imgSrc} alt={product.name} className="pc-modal-img" />
          </div>
          <div className="pc-modal-right">
            <h3 className="pc-modal-title">{product.name}</h3>
            <p className="pc-modal-price">
              {hasVariedPrice && !matchedVariant ? `Desde ${formatCOP(basePrice)}` : formatCOP(displayPrice)}
            </p>

            {error && <p className="pc-modal-error">{error}</p>}

            {loading ? (
              <p className="pc-modal-loading">Cargando variantes...</p>
            ) : availableSizes.length === 0 ? (
              <p className="pc-modal-loading">Este producto no tiene variantes disponibles.</p>
            ) : (
              <>
                <div className="pc-modal-field">
                  <label className="pc-modal-label">Talla</label>
                  <div className="pc-modal-chips">
                    {availableSizes.map((s) => (
                      <button
                        key={s}
                        className={`pc-chip ${size === s ? 'pc-chip--active' : ''}`}
                        onClick={() => { setSize(s); setColor(null); setQty(1) }}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                <div className="pc-modal-field">
                  <label className="pc-modal-label">Color</label>
                  <div className="pc-modal-chips">
                    {availableColors.map((c) => (
                      <button
                        key={c}
                        className={`pc-chip ${color === c ? 'pc-chip--active' : ''}`}
                        onClick={() => { setColor(c); setQty(1) }}
                      >{c}</button>
                    ))}
                  </div>
                </div>

                {matchedVariant && (
                  <p className="pc-modal-stock">Stock disponible: {maxStock}</p>
                )}

                <div className="pc-modal-field">
                  <label className="pc-modal-label">Cantidad</label>
                  <div className="pc-modal-qty">
                    <button
                      className="pc-qty-btn"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      aria-label="Disminuir cantidad"
                    >−</button>
                    <span className="pc-qty-value">{qty}</span>
                    <button
                      className="pc-qty-btn"
                      onClick={() => setQty((q) => Math.min(Math.max(1, maxStock), q + 1))}
                      disabled={qty >= Math.max(1, maxStock)}
                      aria-label="Aumentar cantidad"
                    >+</button>
                  </div>
                </div>

                <button
                  className="pc-modal-submit"
                  disabled={!size || !color || !matchedVariant || submitting}
                  onClick={handleAdd}
                >{submitting ? 'Agregando...' : 'Agregar al carrito'}</button>
              </>
            )}

            <button className="pc-modal-cancel" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}