import type { PromptTemplate, PromptVariable } from '@/domain/entities/prompt'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'

export interface PromptContext {
  restaurantName?: string
  region?: string
  cuisine?: string
  situation?: string
  partySize?: string
  budget?: string
  mood?: string
  exclude?: string
}

/** Map template variable keys to context fields */
const VAR_TO_CONTEXT: Record<string, keyof PromptContext> = {
  restaurant_name: 'restaurantName',
  region: 'region',
  cuisine: 'cuisine',
  situation: 'situation',
  party_size: 'partySize',
  budget: 'budget',
  mood: 'mood',
  exclude: 'exclude',
  restaurant_a: 'restaurantName',
}

/**
 * Resolve template variables using context.
 * Returns a map of variable key → resolved value.
 */
export function resolveVariables(
  template: PromptTemplate,
  context: PromptContext,
): Record<string, string> {
  const resolved: Record<string, string> = {}

  for (const v of template.variables) {
    const contextKey = VAR_TO_CONTEXT[v.key]
    if (contextKey && context[contextKey]) {
      resolved[v.key] = context[contextKey]!
    }
  }

  return resolved
}

/**
 * Get variables that still need user input.
 */
export function getUnfilledVariables(
  template: PromptTemplate,
  resolved: Record<string, string>,
): PromptVariable[] {
  return template.variables.filter(v => !resolved[v.key])
}

/**
 * Build a PromptContext from a restaurant entity.
 */
export function buildContextFromRestaurant(restaurant: RestaurantWithSummary): PromptContext {
  return {
    restaurantName: restaurant.name,
    region: restaurant.shortAddress ?? restaurant.region ?? undefined,
    cuisine: restaurant.cuisineCategory,
  }
}
