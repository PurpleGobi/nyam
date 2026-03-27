'use client'

import type { AromaSectorId } from '@/domain/entities/aroma'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'
import { finishToSeconds } from '@/domain/entities/wine-structure'

interface AromaDisplayProps {
  aromaRegions: globalThis.Record<string, unknown> | null
  aromaLabels: string[] | null
  complexity: number | null
  finish: number | null
  balance: number | null
}

export function AromaDisplay({ aromaRegions, aromaLabels, complexity, finish, balance }: AromaDisplayProps) {
  if (!aromaRegions || !aromaLabels || aromaLabels.length === 0) return null

  const activeIds = Object.keys(aromaRegions) as AromaSectorId[]

  return (
    <div className="flex flex-col gap-3">
      {/* 아로마 라벨 칩 */}
      <div className="flex flex-wrap gap-1.5">
        {aromaLabels.map((label) => {
          const sector = AROMA_SECTORS.find((s) => s.nameKo === label)
          return (
            <span
              key={label}
              className="rounded-full px-2.5 py-1"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: sector ? `${sector.hex}20` : 'var(--bg)',
                color: sector ? sector.hex : 'var(--text-sub)',
                border: `1px solid ${sector ? `${sector.hex}40` : 'var(--border)'}`,
              }}
            >
              {label}
            </span>
          )
        })}
      </div>

      {/* 구조 평가 요약 */}
      {(complexity !== null || finish !== null || balance !== null) && (
        <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
          {[
            complexity !== null ? `복합성 ${complexity}` : null,
            finish !== null ? `여운 ${finishToSeconds(finish)}초+` : null,
            balance !== null ? `균형 ${balance}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  )
}
