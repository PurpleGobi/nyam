'use client'

import { LayoutGrid, List, CalendarDays, Map, Filter, ArrowUpDown } from 'lucide-react'
import type { HomeTab, ViewMode } from '@/domain/entities/home-state'

interface HomeTabsProps {
  activeTab: HomeTab
  viewMode: ViewMode
  onTabChange: (tab: HomeTab) => void
  onViewCycle: () => void
  onFilterToggle: () => void
  onSortToggle: () => void
}

const VIEW_ICONS: Record<ViewMode, typeof LayoutGrid> = {
  detailed: LayoutGrid,
  compact: List,
  calendar: CalendarDays,
  map: Map,
}

export function HomeTabs({
  activeTab, viewMode, onTabChange, onViewCycle, onFilterToggle, onSortToggle,
}: HomeTabsProps) {
  const foodActive = activeTab === 'restaurant'
  const ViewIcon = VIEW_ICONS[viewMode]

  return (
    <div className="flex items-center justify-between px-4 py-2">
      {/* 탭 */}
      <div className="flex gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'var(--bg)' }}>
        <button
          type="button"
          onClick={() => onTabChange('restaurant')}
          className="rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors"
          style={{
            backgroundColor: foodActive ? 'var(--bg-elevated)' : 'transparent',
            color: foodActive ? 'var(--accent-food)' : 'var(--text-hint)',
            boxShadow: foodActive ? 'var(--shadow-sm)' : 'none',
          }}
        >
          식당
        </button>
        <button
          type="button"
          onClick={() => onTabChange('wine')}
          className="rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors"
          style={{
            backgroundColor: !foodActive ? 'var(--bg-elevated)' : 'transparent',
            color: !foodActive ? 'var(--accent-wine)' : 'var(--text-hint)',
            boxShadow: !foodActive ? 'var(--shadow-sm)' : 'none',
          }}
        >
          와인
        </button>
      </div>

      {/* 뷰 + 필터 + 소팅 */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onViewCycle}
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-sub)' }}
        >
          <ViewIcon size={18} />
        </button>
        <button
          type="button"
          onClick={onFilterToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-sub)' }}
        >
          <Filter size={18} />
        </button>
        <button
          type="button"
          onClick={onSortToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-sub)' }}
        >
          <ArrowUpDown size={18} />
        </button>
      </div>
    </div>
  )
}
