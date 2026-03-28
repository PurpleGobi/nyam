'use client'

import { ChevronRight } from 'lucide-react'

interface FabForwardProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'food' | 'wine'
}

export function FabForward({ onClick, disabled, variant = 'food' }: FabForwardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`fab-forward ${variant === 'wine' ? 'wine' : ''}`}
    >
      <ChevronRight size={22} />
    </button>
  )
}
