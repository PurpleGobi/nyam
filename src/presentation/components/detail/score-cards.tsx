'use client'

import type { ScoreSource } from '@/domain/entities/score'

interface ScoreCardData {
  source: ScoreSource
  label: string
  score: number | null
  subText: string
  available: boolean
  confidence?: number | null
  expandable?: boolean
}

interface ScoreCardsProps {
  accentColor: string  // '--accent-food' | '--accent-wine'
  cards: ScoreCardData[]
  selectedSources: ScoreSource[]
  onToggle: (source: ScoreSource) => void
  toggleActive: boolean  // false = compare 모드에서 토글 비활성
  expandedPanel: 'nyam' | 'bubble' | null
  onPanelToggle: (panel: 'nyam' | 'bubble') => void
}

export function ScoreCards({
  accentColor,
  cards,
  selectedSources,
  onToggle,
  toggleActive,
  expandedPanel,
  onPanelToggle,
}: ScoreCardsProps) {
  return (
    <div className="flex gap-1.5" style={{ padding: '0 20px 10px' }}>
      {cards.map((card) => {
        const isSelected = toggleActive && selectedSources.includes(card.source)
        const isDisabled = !card.available
        const panelKey = card.source === 'nyam' ? 'nyam' : card.source === 'bubble' ? 'bubble' : null
        const isExpanded = panelKey !== null && expandedPanel === panelKey

        return (
          <button
            key={card.source}
            type="button"
            onClick={() => {
              if (isDisabled) return
              // 확장 가능한 카드(Nyam, 버블)는 클릭 시 패널 토글
              if (card.expandable && panelKey) {
                onPanelToggle(panelKey)
                return
              }
              if (!toggleActive) return
              onToggle(card.source)
            }}
            className="flex flex-1 flex-col items-center rounded-[10px] transition-colors"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: `1px solid ${isSelected || isExpanded ? `var(${accentColor})` : 'var(--border)'}`,
              padding: '6px 4px',
              minWidth: 0,
              minHeight: '52px',
              textAlign: 'center',
              opacity: isDisabled ? 0.4 : 1,
              pointerEvents: isDisabled ? 'none' : 'auto',
              cursor: !isDisabled ? 'pointer' : 'default',
            }}
          >
            <span
              style={{
                fontSize: '8px',
                fontWeight: 600,
                color: 'var(--text-hint)',
                letterSpacing: '0.02em',
                lineHeight: 1.2,
              }}
            >
              {card.label}
            </span>
            {card.score !== null ? (
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: isSelected || isExpanded ? `var(${accentColor})` : 'var(--text)',
                  lineHeight: 1.2,
                }}
              >
                {Math.round(card.score)}
              </span>
            ) : (
              <span style={{ fontSize: '16px', color: 'var(--border-bold)', lineHeight: 1.2 }}>
                —
              </span>
            )}
            {card.subText && (
              <span
                style={{
                  fontSize: '8px',
                  color: 'var(--text-hint)',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {card.subText}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
