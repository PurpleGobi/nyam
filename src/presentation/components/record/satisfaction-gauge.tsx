'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

interface SatisfactionGaugeProps {
  value: number
  labelLeft?: string
  labelRight?: string
  showNumber?: boolean
}

export function SatisfactionGauge({
  value,
  labelLeft = '별로',
  labelRight = '최고',
  showNumber = true,
}: SatisfactionGaugeProps) {
  const clamped = Math.max(1, Math.min(100, value))
  const color = getGaugeColor(clamped)

  return (
    <div className="flex w-full items-center">
      <span className="satisfaction-gauge-hint mr-1.5 shrink-0">
        {labelLeft}
      </span>

      <div className="satisfaction-gauge relative flex-1">
        <div
          className="satisfaction-gauge-fill"
          style={{
            width: `${clamped}%`,
            minWidth: '32px',
            backgroundColor: color,
          }}
        />
        {showNumber && (
          <span className="satisfaction-gauge-label">
            {clamped}
          </span>
        )}
      </div>

      <span className="satisfaction-gauge-hint ml-1.5 shrink-0">
        {labelRight}
      </span>
    </div>
  )
}
