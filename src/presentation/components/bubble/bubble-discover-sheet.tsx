'use client'

import { useState } from 'react'
import { X, TrendingUp, Sparkles, Clock } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleDiscoverSheetProps {
  isOpen: boolean
  onClose: () => void
  recommended: Bubble[]
  trending: Bubble[]
  newest: Bubble[]
  onSelectBubble: (bubble: Bubble) => void
}

type Tab = 'recommended' | 'trending' | 'new'

export function BubbleDiscoverSheet({
  isOpen,
  onClose,
  recommended,
  trending,
  newest,
  onSelectBubble,
}: BubbleDiscoverSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('recommended')

  if (!isOpen) return null

  const tabs: { key: Tab; label: string; icon: typeof Sparkles }[] = [
    { key: 'recommended', label: '추천', icon: Sparkles },
    { key: 'trending', label: '인기', icon: TrendingUp },
    { key: 'new', label: '최신', icon: Clock },
  ]

  const currentList = activeTab === 'recommended' ? recommended : activeTab === 'trending' ? trending : newest

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="flex w-full max-w-[430px] flex-col rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '75vh' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>버블 탐색</span>
          <button type="button" onClick={onClose}>
            <X size={20} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 px-4 py-2">
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
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {currentList.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[var(--text-hint)]">버블이 없습니다</p>
          ) : (
            <div className="flex flex-col gap-2 py-2">
              {currentList.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBubble(b)}
                  className="flex items-center gap-3 rounded-xl p-3 text-left"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
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
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
