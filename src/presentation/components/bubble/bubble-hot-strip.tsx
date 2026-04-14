'use client'

import { TrendingUp, Flame, Sparkles } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleHotStripProps {
  bubbles: Bubble[]
  onBubbleClick: (id: string) => void
}

export function BubbleHotStrip({ bubbles, onBubbleClick }: BubbleHotStripProps) {
  if (bubbles.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5 py-3">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-1.5 px-4">
        <Flame size={14} style={{ color: '#E65100' }} />
        <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
          이번 주 HOT
        </span>
        <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
          활발한 버블
        </span>
      </div>

      {/* 가로 스크롤 카드 */}
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {bubbles.map((bubble, index) => {
          const growthRate = bubble.prevWeeklyRecordCount > 0
            ? Math.round(((bubble.weeklyRecordCount - bubble.prevWeeklyRecordCount) / bubble.prevWeeklyRecordCount) * 100)
            : null

          return (
            <button
              key={bubble.id}
              type="button"
              onClick={() => onBubbleClick(bubble.id)}
              className="flex w-[120px] shrink-0 flex-col items-center gap-2 rounded-2xl p-3 transition-transform active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: index === 0 ? '0 2px 8px rgba(122, 155, 174, 0.15)' : undefined,
              }}
            >
              {/* 아이콘 */}
              <div
                className="flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-xl"
                style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
              >
                <BubbleIcon icon={bubble.icon} size={22} />
              </div>

              {/* 이름 */}
              <span className="w-full truncate text-center text-[12px] font-bold" style={{ color: 'var(--text)' }}>
                {bubble.name}
              </span>

              {/* 성장률 뱃지 */}
              <div className="flex items-center gap-1">
                {growthRate !== null && growthRate > 0 ? (
                  <span
                    className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--positive-light)', color: 'var(--positive)' }}
                  >
                    <TrendingUp size={9} />
                    +{growthRate}%
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
                  >
                    <Sparkles size={9} />
                    NEW
                  </span>
                )}
              </div>

              {/* 이번 주 기록 수 */}
              <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
                이번 주 {bubble.weeklyRecordCount}개
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
