'use client'

import { ChevronLeft, X } from 'lucide-react'

interface RecordNavProps {
  title: string
  variant?: 'food' | 'wine'
  onBack: () => void
  onClose: () => void
}

export function RecordNav({ title, variant = 'food', onBack, onClose }: RecordNavProps) {
  return (
    <nav className="flex items-center justify-between" style={{ height: '44px', padding: '0 16px', backgroundColor: 'var(--bg)' }}>
      <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center" style={{ color: 'var(--text)' }}>
        <ChevronLeft size={22} />
      </button>
      <span style={{ fontSize: '15px', fontWeight: 700, color: variant === 'wine' ? 'var(--accent-wine)' : 'var(--text)' }}>
        {title}
      </span>
      <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center" style={{ color: 'var(--text-sub)' }}>
        <X size={20} />
      </button>
    </nav>
  )
}
