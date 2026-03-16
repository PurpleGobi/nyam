import type { ComparisonResult } from '../entities/comparison-result'

export interface ComparisonInput {
  readonly prompt: string
  readonly restaurantIds: readonly string[]
}

export interface ComparisonRepository {
  compare(input: ComparisonInput): Promise<ComparisonResult>
}
