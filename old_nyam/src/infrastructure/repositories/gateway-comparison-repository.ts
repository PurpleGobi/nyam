import type { ComparisonRepository, ComparisonInput } from '@/domain/repositories/comparison-repository'
import type { ComparisonResult } from '@/domain/entities/comparison-result'

function createFallbackResult(rawText: string, restaurantIds: readonly string[]): ComparisonResult {
  return {
    restaurants: [],
    summary: rawText,
    recommendedOrder: [...restaurantIds],
  }
}

export const gatewayComparisonRepository: ComparisonRepository = {
  async compare(input: ComparisonInput): Promise<ComparisonResult> {
    const response = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input.prompt, restaurantIds: input.restaurantIds }),
    })

    if (!response.ok) {
      throw new Error(`Comparison failed: ${response.status}`)
    }

    const data = await response.json()

    // Validate the response structure
    if (data.restaurants && Array.isArray(data.restaurants)) {
      return data as ComparisonResult
    }

    // Fallback: raw text response
    if (typeof data.summary === 'string') {
      return createFallbackResult(data.summary, input.restaurantIds)
    }

    throw new Error('Unexpected comparison response format')
  },
}
