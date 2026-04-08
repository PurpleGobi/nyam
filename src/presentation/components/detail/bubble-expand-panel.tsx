'use client'

import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleScore {
  bubbleId: string
  bubbleName: string
  icon: string | null
  iconBgColor: string | null
  ratingCount: number
  avgScore: number | null
  cfScore?: number | null      // CF 기반 버블 점수 (있으면 우선 표시)
  memberCount?: number | null   // 버블 멤버 수
}

interface BubbleExpandPanelProps {
  isOpen: boolean
  bubbleScores: BubbleScore[]
  accentColor: string  // '--accent-food' | '--accent-wine'
}

export function BubbleExpandPanel({ isOpen, bubbleScores, accentColor }: BubbleExpandPanelProps) {
  if (bubbleScores.length === 0) return null

  return (
    <div style={{ padding: '0 20px 10px' }}>
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
                  color: '#FFFFFF',
                }}
              >
                <BubbleIcon icon={b.icon} size={12} />
              </div>
              <div className="min-w-0 flex-1">
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
                  {b.bubbleName}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-hint)', marginLeft: '4px' }}>
                  {b.memberCount != null ? `${b.memberCount}명` : `${b.ratingCount}명 평가`}
                </span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 800, color: `var(${accentColor})` }}>
                {(b.cfScore != null ? b.cfScore : b.avgScore) ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
