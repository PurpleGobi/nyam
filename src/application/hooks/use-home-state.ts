'use client'

import { useState, useCallback } from 'react'
import type { HomeTab, ViewMode, ViewModeState, ViewModeStateKey } from '@/domain/entities/home-state'
import { VIEW_MODE_CYCLE, DEFAULT_VIEW_MODE_STATE, makeViewModeStateKey } from '@/domain/entities/home-state'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'

const TAB_STORAGE_KEY = 'nyam_home_tab'
const VIEW_STORAGE_KEY = 'nyam_home_view'

function getStoredTab(): HomeTab | null {
  if (typeof window === 'undefined') return null
  const v = sessionStorage.getItem(TAB_STORAGE_KEY)
  return v === 'restaurant' || v === 'wine' || v === 'bubble' ? v : null
}

function getStoredViewMode(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const v = sessionStorage.getItem(VIEW_STORAGE_KEY)
  return v === 'card' || v === 'list' || v === 'calendar' || v === 'map' ? v : null
}

function createInitialViewModeStates(initialSort?: SortOption): Record<ViewModeStateKey, ViewModeState> {
  const base = initialSort
    ? { ...DEFAULT_VIEW_MODE_STATE, sort: initialSort }
    : { ...DEFAULT_VIEW_MODE_STATE }
  return {
    restaurant_card: { ...base },
    restaurant_list: { ...base },
    restaurant_calendar: { ...base },
    restaurant_map: { ...DEFAULT_VIEW_MODE_STATE, sort: initialSort ?? 'name' },
    wine_card: { ...base },
    wine_list: { ...base },
    wine_calendar: { ...base },
    wine_map: { ...DEFAULT_VIEW_MODE_STATE, sort: initialSort ?? 'latest' },
  }
}

interface UseHomeStateOptions {
  initialTab?: HomeTab
  initialViewMode?: ViewMode
  initialSort?: SortOption
}

export function useHomeState(options?: UseHomeStateOptions) {
  const [activeTab, _setActiveTab] = useState<HomeTab>(options?.initialTab ?? getStoredTab() ?? 'restaurant')
  const [viewMode, _setViewMode] = useState<ViewMode>(options?.initialViewMode ?? getStoredViewMode() ?? 'card')

  const setActiveTab = useCallback((tab: HomeTab) => {
    _setActiveTab(tab)
    sessionStorage.setItem(TAB_STORAGE_KEY, tab)
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    _setViewMode(mode)
    sessionStorage.setItem(VIEW_STORAGE_KEY, mode)
  }, [])
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [viewModeStates, setViewModeStates] = useState(() => createInitialViewModeStates(options?.initialSort))
  const [searchQuery, setSearchQuery] = useState('')

  // 현재 탭×뷰모드의 필터/소팅 상태 (뷰 모드별 독립). 버블 탭은 viewModeState 미사용.
  const stateKey = activeTab !== 'bubble' ? makeViewModeStateKey(activeTab, viewMode) : null
  const { filters: filterRules, sort: currentSort, conjunction } = stateKey
    ? viewModeStates[stateKey]
    : DEFAULT_VIEW_MODE_STATE

  const setFilterRules = useCallback((rules: FilterRule[]) => {
    setViewModeStates((prev) => {
      const key = makeViewModeStateKey(activeTab, viewMode)
      return { ...prev, [key]: { ...prev[key], filters: rules } }
    })
  }, [activeTab, viewMode])

  const setCurrentSort = useCallback((sort: SortOption) => {
    setViewModeStates((prev) => {
      const key = makeViewModeStateKey(activeTab, viewMode)
      return { ...prev, [key]: { ...prev[key], sort } }
    })
  }, [activeTab, viewMode])

  const setConjunction = useCallback((conj: 'and' | 'or') => {
    setViewModeStates((prev) => {
      const key = makeViewModeStateKey(activeTab, viewMode)
      return { ...prev, [key]: { ...prev[key], conjunction: conj } }
    })
  }, [activeTab, viewMode])

  const cycleViewMode = useCallback(() => {
    _setViewMode((prev) => {
      // 버블 탭: card↔list만 순환 (캘린더 없음)
      // 그 외: map→card, card→list→calendar 순환
      const cycle: ViewMode[] = activeTab === 'bubble'
        ? ['card', 'list']
        : VIEW_MODE_CYCLE
      const idx = cycle.indexOf(prev)
      const next = idx === -1
        ? cycle[0]
        : cycle[(idx + 1) % cycle.length]
      sessionStorage.setItem(VIEW_STORAGE_KEY, next)
      return next
    })
  }, [activeTab])

  const toggleMap = useCallback(() => {
    _setViewMode((prev) => {
      const next = prev === 'map' ? 'card' : 'map'
      sessionStorage.setItem(VIEW_STORAGE_KEY, next)
      return next
    })
  }, [])

  // 상호 배타: 소팅/검색 중 하나만 열림
  const toggleSort = useCallback(() => {
    setIsSortOpen((prev) => !prev)
    setIsSearchOpen(false)
  }, [])

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev)
    setIsSortOpen(false)
  }, [])

  const getCurrentViewModeState = useCallback((): ViewModeState => {
    return viewModeStates[makeViewModeStateKey(activeTab, viewMode)]
  }, [activeTab, viewMode, viewModeStates])

  const closeSort = useCallback(() => setIsSortOpen(false), [])

  return {
    activeTab, setActiveTab, viewMode, setViewMode, cycleViewMode,
    toggleMap,
    isSortOpen, toggleSort, closeSort,
    isSearchOpen, toggleSearch,
    filterRules, setFilterRules,
    conjunction, setConjunction,
    currentSort, setCurrentSort,
    searchQuery, setSearchQuery,
    getCurrentViewModeState,
  }
}
