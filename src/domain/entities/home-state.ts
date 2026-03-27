// src/domain/entities/home-state.ts
// R1: 외부 의존 0

export type HomeTab = 'restaurant' | 'wine'
export type ViewMode = 'detailed' | 'compact' | 'calendar' | 'map'

export interface HomeState {
  activeTab: HomeTab
  viewMode: ViewMode
  activeChipId: string | null
}

export const VIEW_MODE_CYCLE: ViewMode[] = ['detailed', 'compact', 'calendar']
