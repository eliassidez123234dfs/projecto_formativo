// ---------------------------------------------------------------
// AddToCartModal.jsx  —  Modal de selección talla/color/cantidad
// Se renderiza con createPortal(document.body): escapa del árbol de
// la card (transform/overflow) y no interfiere con eventos de hover.
// Compartido entre ProductCard (Agregar y 3D) y ProductDetail.
//
// Props:
//  - product  : producto (puede incluir variants ya cargadas)
//  - onClose  : cierra el modal
//  - onAdd    : async (variantId, quantity) => Promise  (agregar al carrito)
//  - onOpen3D : (variant, quantity) => void  — si se provee, el botón pasa a
//               "Continuar al editor 3D" y ejecuta este callback (modo 3D).
// ---------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { fetchProductDetail } from '../../services/api'
import { DEFAULT_IMAGE } from '../../constants'
import { formatCOP } from '../../utils/format'
import { useAddAttemptGuard, extractCartError } from '../../utils/cartLimits'
import '../../styles/product-card.css'

export const AddToCartModal = ({ product, onClose, onAdd, onOpen3D }) => {
  const is3DMode = typeof onOpen3D === 'function'
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [size, setSize] = useState(null)
  const [color, setColor] = useState(null)
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const boxRef = useRef(null)
  const { maxReached, registerFailure, clearAlerts } = useAddAttemptGuard()

  const imgSrc = product.image || DEFAULT_IMAGE
  const basePrice = Number(product.min_price ?? product.price ?? product.base_price ?? 0)
  const hasVariedPrice = product.min_price != null && product.max_price != null && Number(product.min_price) !== Number(product.max_price)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    boxRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

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
        const firstSize = sizes[0] || null
        setSize(firstSize)
        const colorsForSize = [...new Set(variants.filter(v => v.size === firstSize && Number(v.stock) > 0).map(v => v.color).filter(Boolean))]
        setColor(colorsForSize[0] || null)
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

  const firstColorOf = (s) => {
    if (!s) return null
    return [...new Set(variants.filter(v => v.size === s && Number(v.stock) > 0).map(v => v.color).filter(Boolean))][0] || null
  }

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
    if (is3DMode) {
      onOpen3D(matchedVariant, qty)
      onClose()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onAdd(matchedVariant.id, qty)
      clearAlerts()
      toast.success('Producto agregado al carrito')
      try {
        const refreshed = await fetchProductDetail(product.id)
        const variants = refreshed.variants || []
        setVariants(variants)
      } catch {
        // Si falla el refresh de stock, no bloquear la experiencia
      }
      onClose()
    } catch (err) {
      const msg = extractCartError(err, 'No se pudo agregar al carrito.')
      if (!maxReached) {
        setError(msg)
        toast.error(msg)
      }
      registerFailure()
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="pc-modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="pc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-modal-title"
        ref={boxRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="pc-modal-close" onClick={onClose} aria-label="Cerrar">&times;</button>
        <div className="pc-modal-content">
          <div className="pc-modal-left">
            <img src={imgSrc} alt={product.name} className="pc-modal-img" />
          </div>
          <div className="pc-modal-right">
            <h3 id="pc-modal-title" className="pc-modal-title">{product.name}</h3>
            {is3DMode && (
              <p className="pc-modal-3d-hint">
                Elige talla y color para tu diseño 3D. La talla y cantidad se
                aplicarán al carrito cuando guardes el diseño.
              </p>
            )}
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
                        onClick={() => { setSize(s); setColor(firstColorOf(s)); setQty(1) }}
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
                >{is3DMode
                    ? 'Continuar al editor 3D'
                    : submitting ? 'Agregando...' : 'Agregar al carrito'}</button>
              </>
            )}

            <button className="pc-modal-cancel" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}