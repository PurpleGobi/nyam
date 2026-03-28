'use client'

import type { AromaSectorId, AromaSelection } from '@/domain/entities/aroma'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'
import { calculateAromaColor } from '@/shared/utils/aroma-color'
import { finishToSeconds } from '@/domain/entities/wine-structure'
import { AromaWheel } from '@/presentation/components/record/aroma-wheel'
import { GaugeBar } from '@/presentation/components/ui/gauge-slider'

interface AromaDisplayProps {
  aromaRegions: Record<string, unknown> | null
  aromaLabels: string[] | null
  complexity: number | null
  finish: number | null
  balance: number | null
}

export function AromaDisplay({ aromaRegions, aromaLabels, complexity, finish, balance }: AromaDisplayProps) {
  if (!aromaRegions || !aromaLabels || aromaLabels.length === 0) return null

  const activeIds = Object.keys(aromaRegions) as AromaSectorId[]
  const color = calculateAromaColor(activeIds) ?? ''

  const aromaValue: AromaSelection = {
    regions: aromaRegions as Record<AromaSectorId, boolean>,
    labels: aromaLabels,
    color,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 편집용과 동일한 아로마 휠 (readOnly) */}
      <AromaWheel value={aromaValue} readOnly />

      {/* 구조 평가 바 */}
      {(complexity !== null || finish !== null || balance !== null) && (
        <div className="flex flex-col gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {complexity !== null && (
            <GaugeBar label="복합성" value={complexity} valueLabel={String(complexity)} />
          )}
          {finish !== null && (
            <GaugeBar label="여운" value={finish} valueLabel={`${finishToSeconds(finish)}초+`} />
          )}
          {balance !== null && (
            <GaugeBar label="균형" value={balance} valueLabel={String(balance)} />
          )}
        </div>
      )}
    </div>
  )
}
