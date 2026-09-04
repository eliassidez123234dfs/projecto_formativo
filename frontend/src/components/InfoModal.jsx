const CHECKLIST_LABELS = {
  name: 'Nombre del producto',
  description: 'Descripción del producto',
  main_image: 'Imagen principal',
  variant_with_stock: 'Variante con stock disponible',
  ready_to_publish: 'Listo para publicar',
}

const CHECKLIST_ORDER = ['name', 'description', 'main_image', 'variant_with_stock', 'ready_to_publish']

export function formatChecklist(checklist) {
  return CHECKLIST_ORDER.map(k => ({
    label: CHECKLIST_LABELS[k] || k,
    ok: checklist[k],
  }))
}

export default function InfoModal({ type, title, message, checklist, onClose }) {
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'i'
  const accent = type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#2563eb'

  return (
    <div className="form-modal-backdrop" onClick={onClose}>
      <div className="form-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(460px, 95vw)' }}>
        <div className="form-modal-header">
          <h2>{title || ''}</h2>
          <button className="form-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <div style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            padding: 16, borderRadius: 'var(--radius-lg)',
            background: type === 'success' ? '#ecfdf5' : type === 'error' ? '#fef2f2' : '#eff6ff',
            border: `1px solid ${accent}22`,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: accent, color: '#fff', fontSize: 14, fontWeight: 700,
              flexShrink: 0,
            }}>{icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{message}</p>
              {checklist && (
                <div style={{ marginTop: 14 }}>
                  {checklist.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', marginBottom: 6,
                      borderRadius: 'var(--radius-md)',
                      background: item.ok ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${item.ok ? '#22c55e33' : '#ef444433'}`,
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.ok ? '#22c55e' : '#ef4444',
                        color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>{item.ok ? '✓' : '✗'}</span>
                      <span style={{ fontSize: 14, color: '#1e293b' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
