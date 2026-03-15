/**
 * Supabase implementation of InteractionRepository.
 * Logs user interactions as append-only events and retrieves preference summaries.
 */

import { createClient } from '../supabase/client'
import type { PreferenceRank, UserPreferenceSummary } from '@/domain/entities/interaction'
import type { InteractionRepository, LogInteractionInput } from '@/domain/repositories/interaction-repository'

interface RawPreferenceSummary {
  top_cuisines: readonly { label: string; count: number }[]
  top_regions: readonly { label: string; count: number }[]
  top_situations: readonly { label: string; count: number }[]
  search_keywords: readonly { label: string; count: number }[]
  total_interactions: number
  computed_at: string
}

function toPreferenceRanks(raw: readonly { label: string; count: number }[]): PreferenceRank[] {
  return raw.map(r => ({ label: r.label, count: Number(r.count) }))
}

export const supabaseInteractionRepository: InteractionRepository = {
  async logInteraction(input: LogInteractionInput): Promise<void> {
    const supabase = createClient()

    await supabase
      .from('user_interactions')
      .insert({
        user_id: input.userId,
        event_type: input.eventType,
        event_data: input.eventData,
      })
    // Fire-and-forget: errors are silently ignored
  },

  async getPreferenceSummary(userId: string, days = 90): Promise<UserPreferenceSummary> {
    const supabase = createClient()

    const { data, error } = await supabase
      .rpc('get_user_preference_summary', {
        p_user_id: userId,
        p_days: days,
      })

    if (error) {
      throw new Error(`Failed to fetch preference summary: ${error.message}`)
    }

    const raw = data as unknown as RawPreferenceSummary

    return {
      topCuisines: toPreferenceRanks(raw.top_cuisines),
      topRegions: toPreferenceRanks(raw.top_regions),
      topSituations: toPreferenceRanks(raw.top_situations),
      searchKeywords: toPreferenceRanks(raw.search_keywords),
      totalInteractions: Number(raw.total_interactions),
      computedAt: raw.computed_at,
    }
  },
}
