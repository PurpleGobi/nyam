import type { RestaurantWithSummary } from './restaurant'

/** A top-scored restaurant recommendation with explanation */
export interface QuickPick {
  readonly restaurant: RestaurantWithSummary
  readonly score: number
  readonly reasons: readonly string[]
}
