import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorInfo } from '../utils/errorCatalog';

const iconAlert = (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function ErrorState({
  status = null,
  error = null,
  module = '',
  onRetry = null,
  full = false,
}) {
  const [showDetails, setShowDetails] = useState(false);

  const derivedStatus =
    status ?? (error && typeof error === 'object' && error.response ? error.response.status : null);
  const info = getErrorInfo(derivedStatus);

  const devMessage =
    (typeof error === 'string' && error.trim()) ||
    (error && typeof error.message === 'string' ? error.message : '') ||
    'Sin descripción técnica disponible.';

  const detailText = [
    `Código HTTP: ${derivedStatus || 'desconocido'}`,
    module ? `Módulo afectado: ${module}` : '',
    `Tipo de error: ${info.name}`,
    `Detalle interno: ${devMessage.slice(0, 300)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const content = (
    <div
      className="error-state"
      style={{
        maxWidth: full ? 480 : undefined,
        margin: full ? 'auto' : undefined,
        padding: full ? 40 : 28,
        textAlign: 'center',
      }}
    >
      <div
        className="error-state-icon"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#fef2f2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        {iconAlert}
      </div>

      <div className="error-state-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
          {info.name}
        </h2>
        {derivedStatus ? (
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 999,
              background: '#fee2e2',
              color: '#b91c1c',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {derivedStatus}
          </span>
        ) : null}
      </div>

      <p style={{ margin: '12px 0 4px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
        {info.es}
      </p>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
        {info.en}
      </p>

      <div className="error-state-actions" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Recargar página / Reload
        </button>
        {onRetry ? (
          <button className="btn btn-secondary" onClick={onRetry}>
            Reintentar / Retry
          </button>
        ) : null}
        <Link to="/" className="btn btn-outline">
          Volver al inicio / Home
        </Link>
      </div>

      <button
        type="button"
        className="error-state-toggle"
        onClick={() => setShowDetails((v) => !v)}
        style={{
          marginTop: 20,
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: 13,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        {showDetails ? 'Ocultar detalle técnico / Hide technical detail' : 'Más información / More info'}
      </button>

      {showDetails ? (
        <div
          className="error-state-details"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: '#f1f5f9',
            fontSize: 12,
            color: '#334155',
            textAlign: 'left',
            lineHeight: 1.7,
            wordBreak: 'break-word',
          }}
        >
          <p style={{ margin: '0 0 8px' }}>{info.devEs}</p>
          <p style={{ margin: '0 0 8px' }}>{info.devEn}</p>
          <p style={{ margin: 0 }}>{detailText}</p>
        </div>
      ) : null}
    </div>
  );

  if (full) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {content}
      </div>
    );
  }

  return <div className="error-state" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>{content}</div>;
}
