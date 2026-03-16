export type InteractionEventType =
  | 'category_click'
  | 'region_select'
  | 'situation_click'
  | 'restaurant_view'
  | 'search_query'
  | 'filter_change'
  | 'sort_change'
  | 'prompt_use'

export interface InteractionEvent {
  readonly id: string
  readonly userId: string
  readonly eventType: InteractionEventType
  readonly eventData: Record<string, string>
  readonly createdAt: string
}

export interface PreferenceRank {
  readonly label: string
  readonly count: number
}

export interface UserPreferenceSummary {
  readonly topCuisines: readonly PreferenceRank[]
  readonly topRegions: readonly PreferenceRank[]
  readonly topSituations: readonly PreferenceRank[]
  readonly searchKeywords: readonly PreferenceRank[]
  readonly totalInteractions: number
  readonly computedAt: string
}
