'use client'

import { useState, useCallback } from 'react'
import type { HomeTab, ViewMode, ViewModeState, ViewModeStateKey } from '@/domain/entities/home-state'
import { VIEW_MODE_CYCLE, DEFAULT_VIEW_MODE_STATE, makeViewModeStateKey } from '@/domain/entities/home-state'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'

function createInitialViewModeStates(): Record<ViewModeStateKey, ViewModeState> {
  return {
    restaurant_detailed: { ...DEFAULT_VIEW_MODE_STATE },
    restaurant_compact: { ...DEFAULT_VIEW_MODE_STATE },
    restaurant_calendar: { ...DEFAULT_VIEW_MODE_STATE },
    wine_detailed: { ...DEFAULT_VIEW_MODE_STATE },
    wine_compact: { ...DEFAULT_VIEW_MODE_STATE },
    wine_calendar: { ...DEFAULT_VIEW_MODE_STATE },
  }
}

interface UseHomeStateOptions {
  initialTab?: HomeTab
  initialViewMode?: ViewMode
}

export function useHomeState(options?: UseHomeStateOptions) {
  const [activeTab, setActiveTab] = useState<HomeTab>(options?.initialTab ?? 'restaurant')
  const [viewMode, setViewMode] = useState<ViewMode>(options?.initialViewMode ?? 'detailed')
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [activeChipId, setActiveChipId] = useState<string | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [viewModeStates, setViewModeStates] = useState(createInitialViewModeStates)
  const [searchQuery, setSearchQuery] = useState('')

  // 현재 탭×뷰모드의 필터/소팅 상태 (뷰 모드별 독립)
  const { filters: filterRules, sort: currentSort, conjunction } = viewModeStates[makeViewModeStateKey(activeTab, viewMode)]

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
    setViewMode((prev) => {
      const idx = VIEW_MODE_CYCLE.indexOf(prev)
      return VIEW_MODE_CYCLE[(idx + 1) % VIEW_MODE_CYCLE.length]
    })
  }, [])

  const toggleMap = useCallback(() => {
    setIsMapOpen((prev) => !prev)
  }, [])

  // 상호 배타: 필터/소팅/검색 중 하나만 열림
  const toggleFilter = useCallback(() => {
    setIsFilterOpen((prev) => !prev)
    setIsSortOpen(false)
    setIsSearchOpen(false)
  }, [])

  const toggleSort = useCallback(() => {
    setIsSortOpen((prev) => !prev)
    setIsFilterOpen(false)
    setIsSearchOpen(false)
  }, [])

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev)
    setIsFilterOpen(false)
    setIsSortOpen(false)
  }, [])

  const getCurrentViewModeState = useCallback((): ViewModeState => {
    return viewModeStates[makeViewModeStateKey(activeTab, viewMode)]
  }, [activeTab, viewMode, viewModeStates])

  return {
    activeTab, setActiveTab, viewMode, cycleViewMode,
    isMapOpen, toggleMap,
    activeChipId, setActiveChipId,
    isFilterOpen, toggleFilter,
    isSortOpen, toggleSort,
    isSearchOpen, toggleSearch,
    filterRules, setFilterRules,
    conjunction, setConjunction,
    currentSort, setCurrentSort,
    searchQuery, setSearchQuery,
    getCurrentViewModeState,
  }
}
