'use client'

import { Beef, Drumstick, Fish, Milk, Leaf, Flame, Candy, Nut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PairingCategory } from '@/domain/entities/record'
import { PAIRING_CATEGORIES } from '@/domain/entities/pairing'

const PAIRING_ICON_MAP: Record<string, LucideIcon> = {
  beef: Beef,
  drumstick: Drumstick,
  fish: Fish,
  milk: Milk,
  leaf: Leaf,
  flame: Flame,
  candy: Candy,
  nut: Nut,
}

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
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--accent-wine-light)',
              border: '1px solid var(--accent-wine-dim)',
              color: 'var(--accent-wine)',
            }}
          >
            {meta ? (
              <>
                {(() => {
                  const Icon = PAIRING_ICON_MAP[meta.icon]
                  return Icon ? <Icon size={12} /> : null
                })()}
                {meta.label}
              </>
            ) : cat}
          </span>
        )
      })}
    </div>
  )
}
