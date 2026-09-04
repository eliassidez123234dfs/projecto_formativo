export default function Pagination({ page, totalPages, count, label, onPageChange }) {
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = [1]
    let start = Math.max(2, page - 2)
    let end = Math.min(totalPages - 1, page + 2)
    if (page <= 4) end = Math.min(totalPages - 1, 6)
    else if (page >= totalPages - 3) start = Math.max(2, totalPages - 5)
    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <div className="pagination">
      <button
        className="btn btn-sm btn-secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Anterior
      </button>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {getPageNumbers().map((p, i) => {
          if (typeof p === 'string') {
            return <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--color-gray-500, #999)', fontSize: 13 }}>...</span>
          }
          return (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pagination-info">
          {count} {label} · Página {page} de {totalPages}
        </span>
        <button
          className="btn btn-sm btn-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
