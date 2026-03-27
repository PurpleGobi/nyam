'use client'

import { useState, useEffect } from 'react'
import type { Wine } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import { getSupabaseClient } from '@/shared/di/container'
import { recordRepo } from '@/shared/di/container'

export function useWineDetail(wineId: string, userId: string | null) {
  const [wine, setWine] = useState<Wine | null>(null)
  const [myRecords, setMyRecords] = useState<DiningRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setIsLoading(true)
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase
          .from('wines')
          .select('*')
          .eq('id', wineId)
          .single()

        if (data) {
          setWine({
            id: data.id,
            name: data.name,
            producer: data.producer,
            region: data.region,
            subRegion: data.sub_region,
            country: data.country,
            variety: data.variety,
            grapeVarieties: data.grape_varieties as Wine['grapeVarieties'],
            wineType: data.wine_type,
            vintage: data.vintage,
            abv: data.abv ? Number(data.abv) : null,
            labelImageUrl: data.label_image_url,
            photos: data.photos,
            bodyLevel: data.body_level,
            acidityLevel: data.acidity_level,
            sweetnessLevel: data.sweetness_level,
            foodPairings: data.food_pairings,
            servingTemp: data.serving_temp,
            decanting: data.decanting,
            referencePrice: data.reference_price,
            drinkingWindowStart: data.drinking_window_start,
            drinkingWindowEnd: data.drinking_window_end,
            vivinoRating: data.vivino_rating ? Number(data.vivino_rating) : null,
            criticScores: data.critic_scores as Wine['criticScores'],
            classification: data.classification,
            nyamScore: data.nyam_score ? Number(data.nyam_score) : null,
            nyamScoreUpdatedAt: data.nyam_score_updated_at,
            externalIds: data.external_ids as Wine['externalIds'],
            cachedAt: data.cached_at,
            nextRefreshAt: data.next_refresh_at,
            createdAt: data.created_at,
          })
        }

        if (userId) {
          const records = await recordRepo.findByUserAndTarget(userId, wineId)
          setMyRecords(records)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [wineId, userId])

  const myAvgScore = myRecords.length > 0
    ? Math.round(myRecords.reduce((sum, r) => sum + (r.satisfaction ?? 0), 0) / myRecords.length)
    : null

  return { wine, myRecords, myAvgScore, isLoading }
}
