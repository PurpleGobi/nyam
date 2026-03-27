'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { WineStructure } from '@/domain/entities/wine-structure'
import { calculateAutoScore, finishToSeconds, getComplexityInitialValue } from '@/domain/entities/wine-structure'

interface WineStructureEvalProps {
  value: WineStructure
  onChange: (value: WineStructure) => void
  aromaRingCount: number
  onAutoScoreChange: (autoScore: number) => void
}

export function WineStructureEval({
  value,
  onChange,
  aromaRingCount,
  onAutoScoreChange,
}: WineStructureEvalProps) {
  const hasUserModifiedComplexity = useRef(false)

  useEffect(() => {
    if (!hasUserModifiedComplexity.current) {
      const initial = getComplexityInitialValue(aromaRingCount)
      const newVal = { ...value, complexity: initial }
      onChange(newVal)
      onAutoScoreChange(calculateAutoScore(aromaRingCount, newVal.finish, newVal.balance))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aromaRingCount])

  const handleChange = useCallback(
    (field: keyof WineStructure, rawValue: string) => {
      const numValue = Number(rawValue)
      if (field === 'complexity') {
        hasUserModifiedComplexity.current = true
      }
      const newVal = { ...value, [field]: numValue }
      onChange(newVal)
      onAutoScoreChange(calculateAutoScore(aromaRingCount, newVal.finish, newVal.balance))
    },
    [value, onChange, aromaRingCount, onAutoScoreChange],
  )

  return (
    <div className="flex w-full flex-col gap-4">
      {/* 복합성 */}
      <div>
        <div className="mb-1.5 flex items-center justify-between" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
          <span>복합성</span>
          <span style={{ fontWeight: 800, color: 'var(--accent-wine)' }}>{value.complexity}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={value.complexity}
          onChange={(e) => handleChange('complexity', e.target.value)}
          className="w-full accent-[var(--accent-wine)]"
        />
        <div className="mt-0.5 flex justify-between" style={{ fontSize: '10px', color: 'var(--text-hint)', opacity: 0.6 }}>
          <span>1차향 (과일/꽃)</span>
          <span>2차향 (발효)</span>
          <span>3차향 (숙성)</span>
        </div>
      </div>

      {/* 여운 */}
      <div>
        <div className="mb-1.5 flex items-center justify-between" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
          <span>여운</span>
          <span style={{ fontWeight: 800, color: 'var(--accent-wine)' }}>{finishToSeconds(value.finish)}초+</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={value.finish}
          onChange={(e) => handleChange('finish', e.target.value)}
          className="w-full accent-[var(--accent-wine)]"
        />
        <div className="mt-0.5 flex justify-between" style={{ fontSize: '10px', color: 'var(--text-hint)', opacity: 0.6 }}>
          <span>짧음 (&lt;3초)</span>
          <span>보통 (5~8초)</span>
          <span>긴 (10초+)</span>
        </div>
      </div>

      {/* 균형 */}
      <div>
        <div className="mb-1.5 flex items-center justify-between" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
          <span>균형</span>
          <span style={{ fontWeight: 800, color: 'var(--accent-wine)' }}>{value.balance}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={value.balance}
          onChange={(e) => handleChange('balance', e.target.value)}
          className="w-full accent-[var(--accent-wine)]"
        />
        <div className="mt-0.5 flex justify-between" style={{ fontSize: '10px', color: 'var(--text-hint)', opacity: 0.6 }}>
          <span>산미 치우침</span>
          <span>조화</span>
          <span>타닌/알코올</span>
        </div>
      </div>
    </div>
  )
}
