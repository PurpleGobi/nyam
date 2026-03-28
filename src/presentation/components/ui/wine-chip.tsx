'use client'

type WineType = 'red' | 'white' | 'rose' | 'orange' | 'sparkling' | 'fortified' | 'dessert'

const WINE_LABELS: Record<WineType, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  orange: 'Orange',
  sparkling: 'Sparkling',
  fortified: 'Fortified',
  dessert: 'Dessert',
}

interface WineChipProps {
  type: WineType
}

export function WineChip({ type }: WineChipProps) {
  return <span className={`wine-chip ${type}`}>{WINE_LABELS[type]}</span>
}
