'use client'

import { LayoutGrid, List, CalendarDays, Map, SlidersHorizontal, ArrowUpDown, Search } from 'lucide-react'
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
  const accentColor = foodActive ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div className="flex items-center px-4 pt-2">
      {/* 탭 — 밑줄 active 스타일 */}
      <div className="flex gap-0">
        <button
          type="button"
          onClick={() => onTabChange('restaurant')}
          className="relative px-3 pb-2 pt-1 text-[14px] font-semibold"
          style={{ color: foodActive ? accentColor : 'var(--text-hint)' }}
        >
          식당
          {foodActive && (
            <span
              className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => onTabChange('wine')}
          className="relative px-3 pb-2 pt-1 text-[14px] font-semibold"
          style={{ color: !foodActive ? accentColor : 'var(--text-hint)' }}
        >
          와인
          {!foodActive && (
            <span
              className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          )}
        </button>
      </div>

      <div className="flex-1" />

      {/* 우측 아이콘들 */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onViewCycle}
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-sub)' }}
          title="보기 전환"
        >
          <ViewIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => {/* map toggle — S5 */}}
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-sub)' }}
          title="지도"
        >
          <Map size={18} />
        </button>
        <button
          type="button"
          onClick={onFilterToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-sub)' }}
          title="필터"
        >
          <SlidersHorizontal size={18} />
        </button>
        <button
          type="button"
          onClick={onSortToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-sub)' }}
          title="정렬"
        >
          <ArrowUpDown size={18} />
        </button>
        <button
          type="button"
          onClick={() => {/* search toggle — S5 */}}
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-sub)' }}
          title="검색"
        >
          <Search size={18} />
        </button>
      </div>
    </div>
  )
}
