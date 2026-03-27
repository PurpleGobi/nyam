'use client'

import type { WineType } from '@/domain/entities/wine'
import { WINE_TYPE_LABELS, WINE_TYPE_COLORS } from '@/domain/entities/wine'

interface WineTypeChipProps {
  wineType: WineType
}

export function WineTypeChip({ wineType }: WineTypeChipProps) {
  const label = WINE_TYPE_LABELS[wineType]
  const color = WINE_TYPE_COLORS[wineType]

  return (
    <span
      className="inline-block rounded-full px-2.5 py-1"
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color,
        backgroundColor: `${color}1A`,
      }}
    >
      {label}
    </span>
  )
}
