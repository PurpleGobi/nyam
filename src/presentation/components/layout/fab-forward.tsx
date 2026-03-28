'use client'

import { ChevronRight } from 'lucide-react'

interface FabForwardProps {
  onClick: () => void
  disabled?: boolean
  accentColor?: string
}

export function FabForward({ onClick, disabled, accentColor = 'var(--accent-food)' }: FabForwardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fixed z-[85] flex items-center justify-center rounded-full transition-transform active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        bottom: '28px',
        right: '16px',
        width: '44px',
        height: '44px',
        backgroundColor: accentColor,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
      }}
    >
      <ChevronRight size={22} color="#FFFFFF" />
    </button>
  )
}
