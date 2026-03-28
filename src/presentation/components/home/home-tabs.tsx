'use client'

import { LayoutGrid, List, CalendarDays, Map, SlidersHorizontal, ArrowUpDown, Search } from 'lucide-react'
import type { HomeTab, ViewMode } from '@/domain/entities/home-state'

interface HomeTabsProps {
  activeTab: HomeTab
  viewMode: ViewMode
  onTabChange: (tab: HomeTab) => void
  onViewCycle: () => void
  onMapToggle: () => void
  isMapOpen: boolean
  onFilterToggle: () => void
  isFilterOpen: boolean
  onSortToggle: () => void
  isSortOpen: boolean
  onSearchToggle: () => void
  isSearchOpen: boolean
}

const VIEW_ICONS: Record<ViewMode, typeof LayoutGrid> = {
  card: LayoutGrid,
  list: List,
  calendar: CalendarDays,
}

export function HomeTabs({
  activeTab, viewMode, onTabChange, onViewCycle,
  onMapToggle, isMapOpen,
  onFilterToggle, isFilterOpen,
  onSortToggle, isSortOpen,
  onSearchToggle, isSearchOpen,
}: HomeTabsProps) {
  const foodActive = activeTab === 'restaurant'
  const ViewIcon = VIEW_ICONS[viewMode]
  const tabType = foodActive ? 'food' : 'wine'

  return (
    <div className="content-tabs flex items-center px-4 pt-3">
      {/* 탭 — 밑줄 active 스타일 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onTabChange('restaurant')}
          className={`filter-tab ${activeTab === 'restaurant' ? 'active food' : ''}`}
        >
          식당
        </button>
        <button
          type="button"
          onClick={() => onTabChange('wine')}
          className={`filter-tab ${activeTab === 'wine' ? 'active wine' : ''}`}
        >
          와인
        </button>
      </div>

      <div className="flex-1" />

      {/* 우측 아이콘들 */}
      <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onViewCycle}
            className="view-cycle-btn"
            title="보기 전환"
          >
            <ViewIcon size={20} />
          </button>
          {foodActive && (
            <button
              type="button"
              onClick={onMapToggle}
              className={`icon-button ${isMapOpen ? 'active map' : ''}`}
              title="지도"
            >
              <Map size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={onFilterToggle}
            className={`icon-button ${isFilterOpen ? `active ${tabType}` : ''}`}
            title="필터"
          >
            <SlidersHorizontal size={20} />
          </button>
          <button
            type="button"
            onClick={onSortToggle}
            className={`icon-button ${isSortOpen ? `active ${tabType}` : ''}`}
            title="정렬"
          >
            <ArrowUpDown size={20} />
          </button>
          <button
            type="button"
            onClick={onSearchToggle}
            className={`icon-button ${isSearchOpen ? `active ${tabType}` : ''}`}
            title="검색"
          >
            <Search size={20} />
          </button>
      </div>
    </div>
  )
}
