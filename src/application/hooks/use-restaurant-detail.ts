'use client'

import { useState, useEffect } from 'react'
import type { Restaurant } from '@/domain/entities/restaurant'
import type { DiningRecord } from '@/domain/entities/record'
import { getSupabaseClient } from '@/shared/di/container'
import { recordRepo } from '@/shared/di/container'

export function useRestaurantDetail(restaurantId: string, userId: string | null) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [myRecords, setMyRecords] = useState<DiningRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setIsLoading(true)
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .single()

        if (data) {
          setRestaurant({
            id: data.id,
            name: data.name,
            address: data.address,
            country: data.country,
            city: data.city,
            area: data.area,
            district: data.district,
            genre: data.genre as Restaurant['genre'],
            priceRange: data.price_range as Restaurant['priceRange'],
            lat: data.lat,
            lng: data.lng,
            phone: data.phone,
            hours: data.hours as Restaurant['hours'],
            photos: data.photos,
            menus: data.menus as Restaurant['menus'],
            naverRating: data.naver_rating ? Number(data.naver_rating) : null,
            kakaoRating: data.kakao_rating ? Number(data.kakao_rating) : null,
            googleRating: data.google_rating ? Number(data.google_rating) : null,
            michelinStars: data.michelin_stars,
            hasBlueRibbon: data.has_blue_ribbon,
            mediaAppearances: data.media_appearances as Restaurant['mediaAppearances'],
            nyamScore: data.nyam_score ? Number(data.nyam_score) : null,
            nyamScoreUpdatedAt: data.nyam_score_updated_at,
            externalIds: data.external_ids as Restaurant['externalIds'],
            cachedAt: data.cached_at,
            nextRefreshAt: data.next_refresh_at,
            createdAt: data.created_at,
          })
        }

        if (userId) {
          const records = await recordRepo.findByUserAndTarget(userId, restaurantId)
          setMyRecords(records)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [restaurantId, userId])

  const myAvgScore = myRecords.length > 0
    ? Math.round(myRecords.reduce((sum, r) => sum + (r.satisfaction ?? 0), 0) / myRecords.length)
    : null

  return { restaurant, myRecords, myAvgScore, isLoading }
}
