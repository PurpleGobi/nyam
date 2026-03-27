'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface BubbleScore {
  bubbleId: string
  bubbleName: string
  icon: string | null
  iconBgColor: string | null
  ratingCount: number
  avgScore: number | null
}

interface BubbleExpandPanelProps {
  bubbleScores: BubbleScore[]
  variant: 'food' | 'wine'
}

export function BubbleExpandPanel({ bubbleScores, variant }: BubbleExpandPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const accentColor = variant === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  if (bubbleScores.length === 0) return null

  return (
    <div className="px-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2"
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
          버블 평가 ({bubbleScores.length})
        </span>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-hint)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
          }}
        />
      </button>

      <div
        style={{
          maxHeight: isOpen ? '200px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        <div className="flex flex-col gap-1.5 pb-2.5">
          {bubbleScores.map((b) => (
            <div
              key={b.bubbleId}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{
                  backgroundColor: b.iconBgColor ?? 'var(--bg)',
                  fontSize: '12px',
                }}
              >
                {b.icon ?? '🫧'}
              </div>
              <div className="min-w-0 flex-1">
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
                  {b.bubbleName}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-hint)', marginLeft: '4px' }}>
                  {b.ratingCount}명 평가
                </span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 800, color: accentColor }}>
                {b.avgScore ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
