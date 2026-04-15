'use client'

import { useState } from 'react'

const PRICE_LEVELS = [
  { value: 1, label: '저가' },
  { value: 2, label: '중간' },
  { value: 3, label: '고가' },
] as const

interface PriceLevelSelectorProps {
  value?: number | null
  onChange?: (value: number | null) => void
}

export function PriceLevelSelector({ value, onChange }: PriceLevelSelectorProps) {
  const [internal, setInternal] = useState<number | null>(value ?? null)
  const selected = value !== undefined ? value : internal

  const handleClick = (v: number) => {
    const next = selected === v ? null : v
    setInternal(next)
    onChange?.(next)
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>가격대</span>
      <div className="flex gap-2">
        {PRICE_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => handleClick(level.value)}
            className="flex flex-1 items-center justify-center rounded-lg py-2 transition-colors"
            style={{
              backgroundColor: selected === level.value ? 'var(--accent-food)' : 'var(--bg-card)',
              border: `1px solid ${selected === level.value ? 'var(--accent-food)' : 'var(--border)'}`,
              color: selected === level.value ? 'var(--text-inverse)' : 'var(--text-sub)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  )
}
