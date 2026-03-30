'use client'

import { useRef, useEffect } from 'react'
import { LayoutGrid, List, CalendarDays, Map, SlidersHorizontal, ArrowUpDown, Search, X } from 'lucide-react'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import type { HomeTab, ViewMode } from '@/domain/entities/home-state'

interface HomeTabsProps {
  activeTab: HomeTab
  viewMode: ViewMode
  onTabChange: (tab: HomeTab) => void
  onViewCycle: () => void
  onMapToggle: () => void
  onFilterToggle: () => void
  isFilterOpen: boolean
  onSortToggle: () => void
  isSortOpen: boolean
  onSearchToggle: () => void
  isSearchOpen: boolean
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onSearchClear: () => void
}

const VIEW_ICONS: Record<Exclude<ViewMode, 'map'>, typeof LayoutGrid> = {
  card: LayoutGrid,
  list: List,
  calendar: CalendarDays,
}

const HOME_TABS: { key: HomeTab; label: string; variant: 'food' | 'wine' }[] = [
  { key: 'restaurant', label: '식당', variant: 'food' },
  { key: 'wine', label: '와인', variant: 'wine' },
]

export function HomeTabs({
  activeTab, viewMode, onTabChange, onViewCycle,
  onMapToggle,
  onFilterToggle, isFilterOpen,
  onSortToggle, isSortOpen,
  onSearchToggle, isSearchOpen,
  searchQuery, onSearchQueryChange, onSearchClear,
}: HomeTabsProps) {
  const foodActive = activeTab === 'restaurant'
  const isMapView = viewMode === 'map'
  // map 뷰일 때 뷰 사이클 아이콘은 card(기본) 표시
  const ViewIcon = VIEW_ICONS[isMapView ? 'card' : viewMode]
  const tabType = foodActive ? 'food' : 'wine'
  const activeVariant = HOME_TABS.find((t) => t.key === activeTab)?.variant ?? 'food'
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchOpen) inputRef.current?.focus()
  }, [isSearchOpen])

  return (
    <StickyTabs
      tabs={HOME_TABS}
      activeTab={activeTab}
      variant={activeVariant}
      onTabChange={onTabChange}
      rightSlot={
        isSearchOpen ? (
          <div className="flex flex-1 items-center gap-2" style={{ marginLeft: '8px' }}>
            <Search size={16} className="shrink-0" style={{ color: 'var(--text-hint)' }} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="이름으로 검색"
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                background: 'none',
                fontSize: '13px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={onSearchClear}
                className="flex shrink-0 items-center justify-center"
                style={{ color: 'var(--text-hint)' }}
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onSearchToggle}
              className="shrink-0 text-[12px] font-medium"
              style={{ color: 'var(--text-sub)' }}
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onViewCycle} className="view-cycle-btn" title="보기 전환">
              <ViewIcon size={20} />
            </button>
            {foodActive && (
              <button type="button" onClick={onMapToggle} className={`icon-button ${isMapView ? 'active map' : ''}`} title="지도">
                <Map size={20} />
              </button>
            )}
            <button type="button" onClick={onFilterToggle} className={`icon-button ${isFilterOpen ? `active ${tabType}` : ''}`} title="필터">
              <SlidersHorizontal size={20} />
            </button>
            <button type="button" onClick={onSortToggle} className={`icon-button ${isSortOpen ? `active ${tabType}` : ''}`} title="정렬">
              <ArrowUpDown size={20} />
            </button>
            <button type="button" onClick={onSearchToggle} className={`icon-button ${isSearchOpen ? `active ${tabType}` : ''}`} title="검색">
              <Search size={20} />
            </button>
          </div>
        )
      }
    />
  )
}
