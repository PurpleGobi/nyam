'use client'

import type { WineType } from '@/domain/entities/wine'
import { WINE_TYPE_LABELS } from '@/domain/entities/wine'

interface WineTypeChipProps {
  wineType: WineType
}

/** WineType → CSS class 매핑 */
const TYPE_CLASS_MAP: Record<WineType, string> = {
  red:        'wine-chip red',
  white:      'wine-chip white',
  rose:       'wine-chip rose',
  sparkling:  'wine-chip sparkling',
  orange:     'wine-chip orange',
  fortified:  'wine-chip fortified',
  dessert:    'wine-chip dessert',
}

export function WineTypeChip({ wineType }: WineTypeChipProps) {
  const label = WINE_TYPE_LABELS[wineType]

  return (
    <span className={TYPE_CLASS_MAP[wineType]}>
      {label}
    </span>
  )
}
