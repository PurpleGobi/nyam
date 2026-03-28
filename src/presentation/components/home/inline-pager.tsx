'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface InlinePagerProps {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export function InlinePager({ currentPage, totalPages, onPrev, onNext }: InlinePagerProps) {
  if (totalPages <= 1) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: 0,
        marginLeft: 'auto',
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage <= 1}
        className="pager-btn"
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          border: '1.5px solid var(--border)',
          background: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          opacity: currentPage <= 1 ? 0.2 : 1,
        }}
      >
        <ChevronLeft size={12} style={{ color: 'var(--text-sub)' }} />
      </button>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-hint)',
          minWidth: '30px',
          textAlign: 'center',
        }}
      >
        {currentPage}/{totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= totalPages}
        className="pager-btn"
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          border: '1.5px solid var(--border)',
          background: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          opacity: currentPage >= totalPages ? 0.2 : 1,
        }}
      >
        <ChevronRight size={12} style={{ color: 'var(--text-sub)' }} />
      </button>
    </div>
  )
}
