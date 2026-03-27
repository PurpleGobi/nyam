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
    <div className="flex items-center justify-center gap-4 py-3">
      <button type="button" onClick={onPrev} disabled={currentPage <= 1}
        className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
        style={{ border: '1px solid var(--border)' }}>
        <ChevronLeft size={16} style={{ color: 'var(--text-sub)' }} />
      </button>
      <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
        {currentPage} / {totalPages}
      </span>
      <button type="button" onClick={onNext} disabled={currentPage >= totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
        style={{ border: '1px solid var(--border)' }}>
        <ChevronRight size={16} style={{ color: 'var(--text-sub)' }} />
      </button>
    </div>
  )
}
