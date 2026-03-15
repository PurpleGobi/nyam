'use client'

import { useCallback } from 'react'
import type { InteractionEventType } from '@/domain/entities/interaction'
import { supabaseInteractionRepository } from '@/infrastructure/repositories/supabase-interaction-repository'
import { useAuth } from './use-auth'

interface UseInteractionTrackerReturn {
  readonly track: (eventType: InteractionEventType, eventData: Record<string, string>) => void
  readonly trackCategoryClick: (category: string) => void
  readonly trackRegionSelect: (region: string) => void
  readonly trackSituationClick: (situationId: string, label: string) => void
  readonly trackRestaurantView: (restaurantId: string, cuisineCategory: string, region: string) => void
  readonly trackSearchQuery: (query: string) => void
  readonly trackPromptUse: (templateId: string, category: string) => void
}

/**
 * Hook for tracking user interaction events.
 * All tracking is fire-and-forget (non-blocking, errors ignored).
 */
export function useInteractionTracker(): UseInteractionTrackerReturn {
  const { user } = useAuth()

  const track = useCallback(
    (eventType: InteractionEventType, eventData: Record<string, string>) => {
      if (!user) return
      void supabaseInteractionRepository.logInteraction({
        userId: user.id,
        eventType,
        eventData,
      })
    },
    [user],
  )

  const trackCategoryClick = useCallback(
    (category: string) => {
      track('category_click', { category })
    },
    [track],
  )

  const trackRegionSelect = useCallback(
    (region: string) => {
      track('region_select', { region })
    },
    [track],
  )

  const trackSituationClick = useCallback(
    (situationId: string, label: string) => {
      track('situation_click', { situation_id: situationId, label })
    },
    [track],
  )

  const trackRestaurantView = useCallback(
    (restaurantId: string, cuisineCategory: string, region: string) => {
      track('restaurant_view', {
        restaurant_id: restaurantId,
        cuisine_category: cuisineCategory,
        region,
      })
    },
    [track],
  )

  const trackSearchQuery = useCallback(
    (query: string) => {
      if (query.length < 2) return
      track('search_query', { query })
    },
    [track],
  )

  const trackPromptUse = useCallback(
    (templateId: string, category: string) => {
      track('prompt_use', { template_id: templateId, category })
    },
    [track],
  )

  return {
    track,
    trackCategoryClick,
    trackRegionSelect,
    trackSituationClick,
    trackRestaurantView,
    trackSearchQuery,
    trackPromptUse,
  }
}
