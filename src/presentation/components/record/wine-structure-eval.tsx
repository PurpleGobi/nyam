'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { WineStructure } from '@/domain/entities/wine-structure'
import { calculateAutoScore, finishToSeconds, getComplexityInitialValue } from '@/domain/entities/wine-structure'
import { LabeledGaugeSlider } from '@/presentation/components/ui/gauge-slider'

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
    (field: keyof WineStructure, numValue: number) => {
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
    <div className="flex w-full flex-col gap-5">
      <LabeledGaugeSlider
        label="균형"
        valueLabel={String(value.balance)}
        value={value.balance}
        onChange={(v) => handleChange('balance', v)}
        accentVar="--accent-wine"
        marks={['불균형', '보통', '완벽한 조화']}
      />
      <LabeledGaugeSlider
        label="여운"
        valueLabel={`${finishToSeconds(value.finish)}초+`}
        value={value.finish}
        onChange={(v) => handleChange('finish', v)}
        accentVar="--accent-wine"
        marks={['짧음 (<3초)', '보통 (5~8초)', '긴 (10초+)']}
      />
      <LabeledGaugeSlider
        label="강도"
        valueLabel={String(value.intensity)}
        value={value.intensity}
        onChange={(v) => handleChange('intensity', v)}
        accentVar="--accent-wine"
        marks={['연한/희미', '보통', '강렬/집중']}
      />
      <LabeledGaugeSlider
        label="복합성"
        valueLabel={String(value.complexity)}
        value={value.complexity}
        onChange={(v) => handleChange('complexity', v)}
        accentVar="--accent-wine"
        marks={['1차향 (과일/꽃)', '2차향 (발효)', '3차향 (숙성)']}
      />
    </div>
  )
}
