'use client'

import type { AromaSectorId, AromaSelection } from '@/domain/entities/aroma'
import { finishToSeconds } from '@/domain/entities/wine-structure'
import { AromaWheel } from '@/presentation/components/record/aroma-wheel'
import { GaugeBar } from '@/presentation/components/ui/gauge-slider'

interface AromaDisplayProps {
  aromaPrimary: string[]
  aromaSecondary: string[]
  aromaTertiary: string[]
  complexity: number | null
  finish: number | null
  balance: number | null
  intensity: number | null
}

export function AromaDisplay({ aromaPrimary, aromaSecondary, aromaTertiary, complexity, finish, balance, intensity }: AromaDisplayProps) {
  const hasAroma = aromaPrimary.length > 0 || aromaSecondary.length > 0 || aromaTertiary.length > 0
  if (!hasAroma) return null

  const aromaValue: AromaSelection = {
    primary: aromaPrimary as AromaSectorId[],
    secondary: aromaSecondary as AromaSectorId[],
    tertiary: aromaTertiary as AromaSectorId[],
  }

  return (
    <div className="flex flex-col gap-4">
      <AromaWheel value={aromaValue} readOnly />

      {/* 품질 평가 바 */}
      {(balance !== null || finish !== null || intensity !== null || complexity !== null) && (
        <div className="flex flex-col gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {balance !== null && (
            <GaugeBar label="균형" value={balance} valueLabel={String(balance)} />
          )}
          {finish !== null && (
            <GaugeBar label="여운" value={finish} valueLabel={`${finishToSeconds(finish)}초+`} />
          )}
          {intensity !== null && (
            <GaugeBar label="강도" value={intensity} valueLabel={String(intensity)} />
          )}
          {complexity !== null && (
            <GaugeBar label="복합성" value={complexity} valueLabel={String(complexity)} />
          )}
        </div>
      )}
    </div>
  )
}
