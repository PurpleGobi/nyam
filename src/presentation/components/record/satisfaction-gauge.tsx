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
  const color = getGaugeColor(value)

  return (
    <div className="flex w-full items-center">
      <span
        className="mr-1.5 shrink-0"
        style={{ fontSize: '11px', color: 'var(--text-hint)' }}
      >
        {labelLeft}
      </span>

      <div
        className="relative flex-1"
        style={{
          height: '32px',
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: '9999px',
            transition: 'width 0.2s ease-out, background-color 0.15s ease-out',
            position: 'relative',
          }}
        >
          {showNumber && value > 15 && (
            <span
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {value}
            </span>
          )}
        </div>
        {showNumber && value <= 15 && (
          <span
            style={{
              position: 'absolute',
              left: `${Math.max(value + 2, 8)}%`,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-sub)',
              lineHeight: 1,
            }}
          >
            {value}
          </span>
        )}
      </div>

      <span
        className="ml-1.5 shrink-0"
        style={{ fontSize: '11px', color: 'var(--text-hint)' }}
      >
        {labelRight}
      </span>
    </div>
  )
}
