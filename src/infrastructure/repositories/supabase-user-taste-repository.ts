/**
 * Supabase implementation of UserTasteRepository
 */

import { createClient } from '../supabase/client'
import type { Row } from '../supabase/types'
import type {
  UserTasteProfile,
  DiningExperience,
  SpiceTolerance,
  PortionPreference,
  DiningFeeling,
} from '@/domain/entities/user-taste'
import type {
  UserTasteRepository,
  CreateDiningExperienceInput,
  UpdateTasteProfileInput,
} from '@/domain/repositories/user-taste-repository'

type TasteProfileRow = Row<'user_taste_profiles'>
type DiningExperienceRow = Row<'dining_experiences'>

/** Map a Supabase taste profile row to the domain entity */
function toTasteProfile(row: TasteProfileRow): UserTasteProfile {
  return {
    userId: row.user_id,
    priorities: row.priorities,
    spiceTolerance: row.spice_tolerance as SpiceTolerance,
    portionPreference: row.portion_preference as PortionPreference,
    diningNotes: row.dining_notes,
    updatedAt: row.updated_at,
  }
}

/** Map a Supabase dining experience row to the domain entity */
function toDiningExperience(row: DiningExperienceRow): DiningExperience {
  return {
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    visitDate: row.visit_date,
    note: row.note,
    liked: row.liked,
    disliked: row.disliked,
    overallFeeling: row.overall_feeling as DiningFeeling,
    createdAt: row.created_at,
  }
}

export const supabaseUserTasteRepository: UserTasteRepository = {
  async getTasteProfile(userId: string): Promise<UserTasteProfile | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch taste profile: ${error.message}`)
    }

    return toTasteProfile(data)
  },

  async updateTasteProfile(
    userId: string,
    input: UpdateTasteProfileInput,
  ): Promise<UserTasteProfile> {
    const supabase = createClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.priorities !== undefined) updateData.priorities = [...input.priorities]
    if (input.spiceTolerance !== undefined) updateData.spice_tolerance = input.spiceTolerance
    if (input.portionPreference !== undefined) updateData.portion_preference = input.portionPreference
    if (input.diningNotes !== undefined) updateData.dining_notes = [...input.diningNotes]

    const { data, error } = await supabase
      .from('user_taste_profiles')
      .upsert({ user_id: userId, ...updateData })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update taste profile: ${error.message}`)
    }

    return toTasteProfile(data)
  },

  async addDiningExperience(
    input: CreateDiningExperienceInput,
  ): Promise<DiningExperience> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('dining_experiences')
      .insert({
        user_id: input.userId,
        restaurant_id: input.restaurantId,
        restaurant_name: input.restaurantName,
        visit_date: input.visitDate,
        note: input.note,
        liked: [...input.liked],
        disliked: [...input.disliked],
        overall_feeling: input.overallFeeling,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to add dining experience: ${error.message}`)
    }

    return toDiningExperience(data)
  },

  async getDiningExperiences(
    userId: string,
    limit = 10,
  ): Promise<readonly DiningExperience[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('dining_experiences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch dining experiences: ${error.message}`)
    }

    return data.map(toDiningExperience)
  },

  async getDiningExperienceByRestaurant(
    userId: string,
    restaurantId: string,
  ): Promise<DiningExperience | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('dining_experiences')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch dining experience: ${error.message}`)
    }

    return data ? toDiningExperience(data) : null
  },
}
