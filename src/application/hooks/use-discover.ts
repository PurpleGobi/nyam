"use client"

import { useCallback, useState } from "react"
import { createClient } from "@/infrastructure/supabase/client"
import type { RecordWithPhotos } from "@/domain/entities/record"

export function useDiscover() {
  const [results, setResults] = useState<RecordWithPhotos[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const supabase = createClient()

  const search = useCallback(async (query: string, filters?: { genre?: string; scene?: string }) => {
    setIsSearching(true)

    let queryBuilder = supabase
      .from("records")
      .select("*, record_photos(*), restaurants(name, address)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(20)

    if (query) {
      queryBuilder = queryBuilder.or(`menu_name.ilike.%${query}%,comment.ilike.%${query}%`)
    }
    if (filters?.genre) {
      queryBuilder = queryBuilder.eq("genre", filters.genre)
    }
    if (filters?.scene) {
      queryBuilder = queryBuilder.eq("scene", filters.scene)
    }

    const { data } = await queryBuilder
    setResults(
      (data ?? []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        restaurantId: item.restaurant_id,
        recordType: item.record_type,
        menuName: item.menu_name,
        genre: item.genre,
        subGenre: item.sub_genre,
        ratingOverall: item.rating_overall,
        ratingTaste: item.rating_taste,
        ratingValue: item.rating_value,
        ratingService: item.rating_service,
        ratingAtmosphere: item.rating_atmosphere,
        ratingCleanliness: item.rating_cleanliness,
        ratingPortion: item.rating_portion,
        ratingBalance: item.rating_balance,
        ratingDifficulty: item.rating_difficulty,
        ratingTimeSpent: item.rating_time_spent,
        ratingReproducibility: item.rating_reproducibility,
        ratingPlating: item.rating_plating,
        ratingMaterialCost: item.rating_material_cost,
        comment: item.comment,
        tags: item.tags ?? [],
        flavorTags: item.flavor_tags ?? [],
        textureTags: item.texture_tags ?? [],
        atmosphereTags: item.atmosphere_tags ?? [],
        visibility: item.visibility,
        aiRecognized: item.ai_recognized,
        completenessScore: item.completeness_score,
        locationLat: item.location_lat,
        locationLng: item.location_lng,
        pricePerPerson: item.price_per_person,
        phaseStatus: item.phase_status,
        phase1CompletedAt: item.phase1_completed_at,
        phase2CompletedAt: item.phase2_completed_at,
        phase3CompletedAt: item.phase3_completed_at,
        scaledRating: item.scaled_rating,
        comparisonCount: item.comparison_count,
        scene: item.scene,
        pairingFood: item.pairing_food,
        purchasePrice: item.purchase_price,
        visitTime: item.visit_time,
        companionCount: item.companion_count,
        totalCost: item.total_cost,
        createdAt: item.created_at,
        photos: ((item.record_photos as Array<Record<string, unknown>>) ?? []).map((p) => ({
          id: p.id as string,
          recordId: p.record_id as string,
          photoUrl: p.photo_url as string,
          thumbnailUrl: p.thumbnail_url as string | null,
          orderIndex: p.order_index as number,
          aiLabels: (p.ai_labels as string[]) ?? [],
        })),
        restaurant: item.restaurants
          ? { name: (item.restaurants as Record<string, unknown>).name as string, address: (item.restaurants as Record<string, unknown>).address as string | null }
          : null,
      })),
    )
    setIsSearching(false)
  }, [supabase])

  return { results, isSearching, search }
}
