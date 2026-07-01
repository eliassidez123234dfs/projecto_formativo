export default function Pagination({ page, totalPages, count, label, onPageChange }) {
  return (
    <div className="pagination">
      <button
        className="btn btn-sm btn-secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Anterior
      </button>
      <span className="pagination-info">
        Página {page} de {totalPages} — {count} {label}
      </span>
      <button
        className="btn btn-sm btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente →
      </button>
    </div>
  )
}
