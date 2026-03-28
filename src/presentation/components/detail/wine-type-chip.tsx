'use client'

import type { WineType } from '@/domain/entities/wine'
import { WINE_TYPE_LABELS } from '@/domain/entities/wine'

interface WineTypeChipProps {
  wineType: WineType
}

/** 타입별 bg/text/border 3종 색상 (설계 스펙) */
const TYPE_STYLES: Record<WineType, { bg: string; text: string; border: string }> = {
  red:        { bg: '#FAF0F0', text: '#B87272', border: '#EDDBDB' },
  white:      { bg: '#FAFAF0', text: '#9A8B30', border: '#E8E4C8' },
  rose:       { bg: '#FDF5F8', text: '#B8879B', border: '#EDD8E0' },
  sparkling:  { bg: '#F0F5FA', text: '#7A9BAE', border: '#D6E0E8' },
  orange:     { bg: '#FDF5F0', text: '#C17B5E', border: '#EDDBD0' },
  fortified:  { bg: '#F5F0F0', text: '#8B6B5E', border: '#DDD0C8' },
  dessert:    { bg: '#FDF8F0', text: '#C9A96E', border: '#E8E0C8' },
}

export function WineTypeChip({ wineType }: WineTypeChipProps) {
  const label = WINE_TYPE_LABELS[wineType]
  const style = TYPE_STYLES[wineType]

  return (
    <span
      className="inline-block"
      style={{
        padding: '1px 7px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        color: style.text,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  )
}
