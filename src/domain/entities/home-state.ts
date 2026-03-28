// src/domain/entities/home-state.ts
// R1: domain 내부 참조만 허용

import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'

export type HomeTab = 'restaurant' | 'wine'
export type ViewMode = 'detailed' | 'compact' | 'calendar' | 'map'

export interface ViewModeState {
  filters: FilterRule[]
  sort: SortOption
  conjunction: 'and' | 'or'
}

export type ViewModeStateKey =
  | 'restaurant_detailed' | 'restaurant_compact' | 'restaurant_calendar'
  | 'wine_detailed' | 'wine_compact' | 'wine_calendar'

export interface HomeState {
  activeTab: HomeTab
  viewMode: ViewMode
  isMapOpen: boolean
  activeChipId: string | null
  viewModeStates: Record<ViewModeStateKey, ViewModeState>
}

export const VIEW_MODE_CYCLE: ViewMode[] = ['detailed', 'compact', 'calendar']

export const DEFAULT_VIEW_MODE_STATE: ViewModeState = {
  filters: [],
  sort: 'latest',
  conjunction: 'and',
}

export function makeViewModeStateKey(tab: HomeTab, mode: ViewMode): ViewModeStateKey {
  const m = mode === 'map' ? 'detailed' : mode
  return `${tab}_${m}` as ViewModeStateKey
}
