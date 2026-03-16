/**
 * Repository interface for user taste profiles and dining experiences.
 */

import type { UserTasteProfile, DiningExperience, DiningFeeling } from '../entities/user-taste'

/** Input for creating a dining experience record */
export interface CreateDiningExperienceInput {
  readonly userId: string
  readonly restaurantId: string
  readonly restaurantName: string
  readonly visitDate: string
  readonly note: string
  readonly liked: readonly string[]
  readonly disliked: readonly string[]
  readonly overallFeeling: DiningFeeling
}

/** Input for updating a taste profile */
export interface UpdateTasteProfileInput {
  readonly priorities?: readonly string[]
  readonly spiceTolerance?: string
  readonly portionPreference?: string
  readonly diningNotes?: readonly string[]
}

export interface UserTasteRepository {
  getTasteProfile(userId: string): Promise<UserTasteProfile | null>
  updateTasteProfile(userId: string, input: UpdateTasteProfileInput): Promise<UserTasteProfile>
  addDiningExperience(input: CreateDiningExperienceInput): Promise<DiningExperience>
  getDiningExperiences(userId: string, limit?: number): Promise<readonly DiningExperience[]>
  getDiningExperienceByRestaurant(userId: string, restaurantId: string): Promise<DiningExperience | null>
}
