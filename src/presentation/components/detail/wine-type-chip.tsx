'use client'

import type { WineType } from '@/domain/entities/wine'
import { WINE_TYPE_COLORS } from '@/domain/entities/wine'

interface WineTypeChipProps {
  wineType: WineType
}

export function WineTypeChip({ wineType }: WineTypeChipProps) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize text-white"
      style={{ backgroundColor: WINE_TYPE_COLORS[wineType] ?? 'var(--accent-wine)' }}
    >
      {wineType}
    </span>
  )
}
