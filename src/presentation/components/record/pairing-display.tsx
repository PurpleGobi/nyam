'use client'

import type { PairingCategory } from '@/domain/entities/record'
import { PAIRING_CATEGORIES } from '@/domain/entities/pairing'

interface PairingDisplayProps {
  categories: PairingCategory[]
}

export function PairingDisplay({ categories }: PairingDisplayProps) {
  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const meta = PAIRING_CATEGORIES.find((p) => p.value === cat)
        return (
          <span
            key={cat}
            className="rounded-full px-3 py-1.5"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--accent-wine-light)',
              border: '1px solid var(--accent-wine-dim)',
              color: 'var(--accent-wine)',
            }}
          >
            {meta ? `${meta.icon} ${meta.label}` : cat}
          </span>
        )
      })}
    </div>
  )
}
