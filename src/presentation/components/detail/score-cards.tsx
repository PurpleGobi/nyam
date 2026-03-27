'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

interface ScoreSlot {
  label: string
  value: number | null
  suffix?: string
}

interface ScoreCardsProps {
  slots: [ScoreSlot, ScoreSlot, ScoreSlot]
}

export function ScoreCards({ slots }: ScoreCardsProps) {
  return (
    <div className="flex gap-2 px-4">
      {slots.map((slot, i) => (
        <div
          key={i}
          className="flex flex-1 flex-col items-center rounded-xl p-3"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-hint)', fontWeight: 500 }}>
            {slot.label}
          </span>
          {slot.value !== null ? (
            <span
              className="mt-1"
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: getGaugeColor(slot.value),
              }}
            >
              {slot.value}
              {slot.suffix && (
                <span style={{ fontSize: '12px', fontWeight: 500 }}>{slot.suffix}</span>
              )}
            </span>
          ) : (
            <span className="mt-1" style={{ fontSize: '14px', color: 'var(--text-hint)' }}>
              —
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
