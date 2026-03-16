'use client'

import { useState, useCallback, useMemo } from 'react'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import type { ComparisonResult } from '@/domain/entities/comparison-result'
import type { UserProfile } from '@/domain/entities/user'
import type { UserTasteProfile, DiningExperience } from '@/domain/entities/user-taste'
import {
  buildComparisonPrompt,
  buildUserContext,
} from '@/shared/utils/prompt-resolver'
import type { PromptContext, RestaurantContextData } from '@/shared/utils/prompt-resolver'
import { comparisonRepository } from '@/di/repositories'

interface UseComparisonInput {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly occasion: string | null
  readonly partySize: string | null
  readonly budget: string | null
  readonly profile: UserProfile | null
  readonly tasteProfile: UserTasteProfile | null
  readonly experiences: readonly DiningExperience[]
}

interface UseComparisonReturn {
  readonly result: ComparisonResult | null
  readonly isComparing: boolean
  readonly error: Error | null
  readonly compare: () => void
}

function toContextData(r: RestaurantWithSummary): RestaurantContextData {
  return {
    name: r.name,
    address: r.shortAddress ?? r.address,
    cuisine: r.cuisine,
    cuisineCategory: r.cuisineCategory,
    priceRange: r.priceRange,
    region: r.region,
    externalRatings: r.ratings.map(rt => ({
      source: rt.source,
      rating: rt.rating,
      reviewCount: rt.reviewCount,
    })),
    verificationCount: r.verificationCount,
    avgScores: {
      taste: r.avgTaste,
      value: r.avgValue,
      service: r.avgService,
      ambiance: r.avgAmbiance,
    },
  }
}

export function useComparison(input: UseComparisonInput): UseComparisonReturn {
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const prompt = useMemo(() => {
    if (input.restaurants.length < 2) return ''

    const contextData = input.restaurants.map(toContextData)
    const context: PromptContext = {
      situation: {
        occasion: input.occasion ?? undefined,
        partySize: input.partySize ?? undefined,
        budget: input.budget ?? undefined,
      },
      user: input.profile
        ? buildUserContext(input.profile, input.tasteProfile, input.experiences)
        : undefined,
    }

    return buildComparisonPrompt(contextData, context)
  }, [input.restaurants, input.occasion, input.partySize, input.budget, input.profile, input.tasteProfile, input.experiences])

  const compare = useCallback(() => {
    if (!prompt || input.restaurants.length < 2) return

    setIsComparing(true)
    setError(null)

    comparisonRepository
      .compare({
        prompt,
        restaurantIds: input.restaurants.map(r => r.id),
      })
      .then(setResult)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => setIsComparing(false))
  }, [prompt, input.restaurants])

  return { result, isComparing, error, compare }
}
