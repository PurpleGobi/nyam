'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Beef, Drumstick, Fish, Milk, Leaf, Flame, Candy, Nut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PairingCategory } from '@/domain/entities/record'
import { PAIRING_CATEGORIES } from '@/domain/entities/pairing'

const PAIRING_ICON_MAP: Record<string, LucideIcon> = {
  beef: Beef,
  drumstick: Drumstick,
  fish: Fish,
  milk: Milk,
  leaf: Leaf,
  flame: Flame,
  candy: Candy,
  nut: Nut,
}

interface PairingGridProps {
  value: PairingCategory[]
  onChange: (value: PairingCategory[]) => void
  aiSuggestions?: PairingCategory[]
  customInput?: string
  onCustomInputChange?: (value: string) => void
}

export function PairingGrid({
  value,
  onChange,
  aiSuggestions,
  customInput,
  onCustomInputChange,
}: PairingGridProps) {
  const hasInitRef = useRef(false)

  useEffect(() => {
    if (!hasInitRef.current && aiSuggestions && aiSuggestions.length > 0 && value.length === 0) {
      hasInitRef.current = true
      onChange(aiSuggestions)
    }
  }, [aiSuggestions, value.length, onChange])

  const toggleCategory = useCallback(
    (category: PairingCategory) => {
      if (value.includes(category)) {
        onChange(value.filter((v) => v !== category))
      } else {
        onChange([...value, category])
      }
    },
    [value, onChange],
  )

  return (
    <div className="flex w-full flex-col">
      <div className="grid grid-cols-2 gap-2">
        {PAIRING_CATEGORIES.map((cat) => {
          const isSelected = value.includes(cat.value)
          const isAi = aiSuggestions?.includes(cat.value)

          return (
            <button
              key={cat.value}
              type="button"
              className="relative flex flex-col items-center p-2.5 transition-all active:scale-[0.97]"
              style={{
                border: `1.5px solid ${isSelected ? 'var(--accent-wine)' : 'var(--border)'}`,
                borderRadius: '10px',
                backgroundColor: isSelected ? 'color-mix(in srgb, var(--accent-wine) 8%, transparent)' : 'var(--bg-card)',
              }}
              onClick={() => toggleCategory(cat.value)}
            >
              {isAi && (
                <span
                  className="absolute right-1 top-1"
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    backgroundColor: 'var(--accent-wine)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                  }}
                >
                  AI
                </span>
              )}
              {(() => {
                const Icon = PAIRING_ICON_MAP[cat.icon]
                return Icon ? <Icon size={22} style={{ marginBottom: '2px', color: isSelected ? 'var(--accent-wine)' : 'var(--text-sub)' }} /> : null
              })()}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isSelected ? 'var(--accent-wine)' : 'var(--text)',
                }}
              >
                {cat.label}
              </span>
              <span
                style={{
                  fontSize: '9px',
                  color: isSelected ? 'var(--accent-wine)' : 'var(--text-hint)',
                  opacity: isSelected ? 0.7 : 1,
                  lineHeight: 1.3,
                  marginTop: '3px',
                  textAlign: 'center',
                }}
              >
                {cat.examples}
              </span>
            </button>
          )
        })}
      </div>

      {onCustomInputChange && (
        <input
          type="text"
          value={customInput ?? ''}
          onChange={(e) => onCustomInputChange(e.target.value)}
          placeholder="직접 입력 (예: 그릴 채소, 트러플 리조또)"
          className="mt-2 w-full"
          style={{
            padding: '10px 14px',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--text)',
            backgroundColor: 'var(--bg-card)',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-wine)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        />
      )}
    </div>
  )
}
