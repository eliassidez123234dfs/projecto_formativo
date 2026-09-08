export default function ConfirmModal({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false, onConfirm, onCancel }) {
  return (
    <div className="form-modal-backdrop" onClick={onCancel}>
      <div className="form-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 95vw)' }}>
        <div className="form-modal-header">
          <h2>{title}</h2>
          <button className="form-modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="form-modal-body">
          <div style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            padding: 16, borderRadius: 'var(--radius-lg)',
            background: danger ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${danger ? '#ef444422' : '#f59e0b22'}`,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: danger ? '#ef4444' : '#f59e0b',
              color: '#fff', fontSize: 14, fontWeight: 700,
              flexShrink: 0,
            }}>?</span>
            <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>
        <div className="form-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
