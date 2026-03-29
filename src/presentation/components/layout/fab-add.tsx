'use client'

import { Plus } from 'lucide-react'

type FabVariant = 'default' | 'food' | 'wine' | 'social'

interface FabAddProps {
  onClick: () => void
  variant?: FabVariant
}

const VARIANT_STYLES: Record<FabVariant, { bg: string; color: string }> = {
  default: { bg: 'rgba(248, 246, 243, 0.88)', color: 'var(--text)' },
  food: { bg: 'var(--accent-food)', color: '#FFFFFF' },
  wine: { bg: 'var(--accent-wine)', color: '#FFFFFF' },
  social: { bg: 'var(--accent-social)', color: '#FFFFFF' },
}

export function FabAdd({ onClick, variant = 'default' }: FabAddProps) {
  const v = VARIANT_STYLES[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      className="fab-add"
      style={{ backgroundColor: v.bg, color: v.color }}
    >
      <Plus size={26} />
    </button>
  )
}
