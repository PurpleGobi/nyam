// src/domain/entities/home-state.ts
// R1: domain 내부 참조만 허용

import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'

export type HomeTab = 'restaurant' | 'wine' | 'bubble'
export type ViewMode = 'card' | 'list' | 'calendar' | 'map'

export interface ViewModeState {
  filters: FilterRule[]
  sort: SortOption
  conjunction: 'and' | 'or'
}

export type ViewModeStateKey =
  | 'restaurant_card' | 'restaurant_list' | 'restaurant_calendar' | 'restaurant_map'
  | 'wine_card' | 'wine_list' | 'wine_calendar' | 'wine_map'

export interface HomeState {
  activeTab: HomeTab
  viewMode: ViewMode
  activeChipId: string | null
  viewModeStates: Record<ViewModeStateKey, ViewModeState>
}

export const VIEW_MODE_CYCLE: ViewMode[] = ['card', 'list', 'calendar']

export const DEFAULT_VIEW_MODE_STATE: ViewModeState = {
  filters: [],
  sort: 'latest',
  conjunction: 'and',
}

export function makeViewModeStateKey(tab: HomeTab, mode: ViewMode): ViewModeStateKey {
  const t = tab
  const m = mode
  return `${t}_${m}` as ViewModeStateKey
}
