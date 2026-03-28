'use client'

import { ChevronLeft } from 'lucide-react'

interface FabBackProps {
  onClick: () => void
}

export function FabBack({ onClick }: FabBackProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-[85] flex items-center justify-center rounded-full transition-transform active:scale-90"
      style={{
        bottom: '28px',
        left: '16px',
        width: '44px',
        height: '44px',
        backgroundColor: 'rgba(248,246,243,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
      }}
    >
      <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
    </button>
  )
}
