'use client'

import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import type { BubbleScoreEntry } from '@/domain/entities/score'

interface BubbleExpandPanelProps {
  isOpen: boolean
  bubbleScores: BubbleScoreEntry[]
  accentColor: string  // '--accent-food' | '--accent-wine'
}

export function BubbleExpandPanel({ isOpen, bubbleScores, accentColor }: BubbleExpandPanelProps) {
  // 기록 1건+ 있는 버블만 표시
  const eligible = bubbleScores.filter(b => b.raterCount >= 1)
  if (eligible.length === 0) return null

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
          {/* 헤더 */}
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            버블별 점수
          </span>
          {eligible.map((b) => (
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
              </div>
              <div className="flex flex-col items-end">
                <span style={{ fontSize: '16px', fontWeight: 800, color: `var(${accentColor})` }}>
                  {b.score !== null ? Math.round(b.score) : '—'}
                </span>
                <span style={{ fontSize: '8px', color: 'var(--text-hint)', whiteSpace: 'nowrap' }}>
                  확신 {Math.round(b.confidence * 100)}% · {b.raterCount}명 평가
                </span>
              </div>
            </div>
          ))}
          {/* 안내 텍스트 */}
          <span style={{ fontSize: '9px', color: 'var(--text-hint)', textAlign: 'center' }}>
            가입한 버블 중 기록 1건+ 있는 것만 표시
          </span>
        </div>
      </div>
    </div>
  )
}
