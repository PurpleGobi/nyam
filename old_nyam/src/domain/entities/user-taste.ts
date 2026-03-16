/**
 * User taste profile and dining experience entities.
 * Aligned with: user_taste_profiles, dining_experiences tables
 */

/** Spice tolerance level */
export type SpiceTolerance = 'none' | 'mild' | 'medium' | 'hot' | 'very_hot'

/** Preferred portion size */
export type PortionPreference = 'small' | 'medium' | 'large'

/** Overall dining feeling */
export type DiningFeeling = 'great' | 'good' | 'okay' | 'bad'

/** User's taste profile derived from their experiences and explicit preferences */
export interface UserTasteProfile {
  readonly userId: string
  /** What the user values most (e.g., '맛', '분위기', '가성비') ranked by importance */
  readonly priorities: readonly string[]
  /** Spice tolerance level */
  readonly spiceTolerance: SpiceTolerance
  /** Preferred portion size */
  readonly portionPreference: PortionPreference
  /** Important dining factors explicitly stated by user */
  readonly diningNotes: readonly string[]
  readonly updatedAt: string
}

/** A logged dining experience for a restaurant */
export interface DiningExperience {
  readonly id: string
  readonly userId: string
  readonly restaurantId: string
  readonly restaurantName: string
  readonly visitDate: string
  /** Free-form note about the experience */
  readonly note: string
  /** What they liked */
  readonly liked: readonly string[]
  /** What they didn't like */
  readonly disliked: readonly string[]
  /** Their overall mood/feeling */
  readonly overallFeeling: DiningFeeling
  readonly createdAt: string
}
