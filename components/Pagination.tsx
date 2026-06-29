'use client'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  // Show max 7 page buttons: first, last, current +/- 2, and ellipsis
  function getVisible(): (number | '...')[] {
    if (totalPages <= 7) return pages
    const result: (number | '...')[] = []
    const around = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages))
    let prev = 0
    for (const p of Array.from(around).sort((a, b) => a - b)) {
      if (p - prev > 1) result.push('...')
      result.push(p)
      prev = p
    }
    return result
  }

  return (
    <nav className="flex items-center justify-center gap-1 pt-8" aria-label="Pagination">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center border border-ivoire text-sable hover:border-sable hover:text-encre disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Page précédente"
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
          <path d="M7 1L2 6L7 11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
        </svg>
      </button>

      {getVisible().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-sable text-body-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`
              w-8 h-8 flex items-center justify-center text-body-sm font-mono-custom transition-colors
              ${p === page
                ? 'bg-encre text-parchemin border border-encre'
                : 'border border-ivoire text-sable hover:border-sable hover:text-encre'
              }
            `}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center border border-ivoire text-sable hover:border-sable hover:text-encre disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Page suivante"
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
          <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
        </svg>
      </button>
    </nav>
  )
}
