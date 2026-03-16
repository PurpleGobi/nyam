/**
 * Taste Style Profile - gamified food persona derived from user behavior patterns.
 */

/** Food persona archetype based on behavior patterns */
export type FoodPersonaType =
  | 'adventurer'    // explores many cuisines/regions
  | 'loyalist'      // sticks to favorites
  | 'trendsetter'   // searches a lot, finds new spots
  | 'socialite'     // group dining, date-focused situations
  | 'solo-gourmet'  // solo dining, quality-focused
  | 'newcomer'      // not enough data yet

export interface FoodPersona {
  readonly type: FoodPersonaType
  readonly title: string
  readonly subtitle: string
  readonly emoji: string
}

export interface TasteStyleLevel {
  readonly level: number
  readonly title: string
  readonly currentXp: number
  readonly nextLevelXp: number
}

export interface TasteStyleStat {
  readonly label: string
  readonly value: number
  readonly maxValue: number
  readonly icon: string
}

export interface TasteStyleProfile {
  readonly persona: FoodPersona
  readonly level: TasteStyleLevel
  readonly topCuisines: readonly string[]
  readonly topRegions: readonly string[]
  readonly topSituations: readonly string[]
  readonly stats: {
    readonly diversity: number      // 0-100: how many different cuisines
    readonly exploration: number    // 0-100: how many different regions
    readonly consistency: number    // 0-100: how often they return to favorites
    readonly engagement: number     // 0-100: total interaction frequency
  }
  readonly totalInteractions: number
}
