'use client'

import { useState } from 'react'
import { Sparkles, MapPin, TrendingUp, Zap } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface BubbleDiscoverSheetProps {
  isOpen: boolean
  onClose: () => void
  recommended: Bubble[]
  nearby: Bubble[]
  trending: Bubble[]
  newest: Bubble[]
  onSelectBubble: (bubble: Bubble) => void
  tasteMatchMap?: Record<string, number>
}

type Tab = 'recommended' | 'nearby' | 'trending' | 'new'

export function BubbleDiscoverSheet({
  isOpen,
  onClose,
  recommended,
  nearby,
  trending,
  newest,
  onSelectBubble,
  tasteMatchMap,
}: BubbleDiscoverSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('recommended')

  const tabs: { key: Tab; label: string; icon: typeof Sparkles }[] = [
    { key: 'recommended', label: '추천', icon: Sparkles },
    { key: 'nearby', label: '근처', icon: MapPin },
    { key: 'trending', label: '인기', icon: TrendingUp },
    { key: 'new', label: '새로운', icon: Zap },
  ]

  const listMap: Record<Tab, Bubble[]> = { recommended, nearby, trending, new: newest }
  const labelMap: Record<Tab, string> = { recommended: '추천', nearby: '근처', trending: '활발', new: '새로운' }
  const currentList = listMap[activeTab]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="버블 탐색" maxHeight="80vh">
      {/* 탭 */}
      <div className="-mx-4 -mt-4 flex gap-1 px-4 py-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-semibold transition-colors"
            style={{
              backgroundColor: activeTab === key ? 'var(--accent-social-light)' : 'transparent',
              color: activeTab === key ? 'var(--accent-social)' : 'var(--text-hint)',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {currentList.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-[var(--text-hint)]">버블이 없습니다</p>
      ) : (
        <div className="flex flex-col gap-2">
          {currentList.map((b) => {
            const matchPct = tasteMatchMap?.[b.id]
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBubble(b)}
                className="card flex items-center gap-3 rounded-xl p-3 text-left"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: b.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
                >
                  <BubbleIcon icon={b.icon} size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[var(--text)]">{b.name}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-hint)]">
                    멤버 {b.memberCount}명 · 기록 {b.recordCount}개
                    {matchPct !== undefined && ` · 취향 ${matchPct}%`}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold" style={{ color: 'var(--accent-social)' }}>
                  {labelMap[activeTab]}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </BottomSheet>
  )
}
