'use client'

import { ChevronRight } from 'lucide-react'

interface FabForwardProps {
  onClick: () => void
  accentColor?: string
}

export function FabForward({ onClick, accentColor = 'var(--accent-food)' }: FabForwardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-50 flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90"
      style={{
        bottom: '28px',
        right: '16px',
        backgroundColor: accentColor,
        boxShadow: `0 3px 16px ${accentColor}66`,
      }}
    >
      <ChevronRight size={22} color="#FFFFFF" />
    </button>
  )
}
