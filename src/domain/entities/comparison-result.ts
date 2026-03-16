/** Result of an AI-powered restaurant comparison */
export interface ComparisonResult {
  readonly restaurants: readonly ComparisonEntry[]
  readonly summary: string
  readonly recommendedOrder: readonly string[]
}

export interface ComparisonEntry {
  readonly restaurantId: string
  readonly restaurantName: string
  readonly score: number
  readonly pros: readonly string[]
  readonly cons: readonly string[]
  readonly situationFit: string
}
