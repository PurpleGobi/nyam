"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/infrastructure/supabase/client"
import type { RecordPhoto, RecordWithPhotos } from "@/domain/entities/record"
import type { RecordType, Visibility } from "@/infrastructure/supabase/types"

function mapRecord(item: Record<string, unknown>): RecordWithPhotos {
  return {
    id: item.id as string,
    userId: item.user_id as string,
    restaurantId: item.restaurant_id as string | null,
    recordType: item.record_type as RecordType,
    menuName: item.menu_name as string | null,
    genre: item.genre as string | null,
    subGenre: item.sub_genre as string | null,
    ratingOverall: item.rating_overall as number | null,
    ratingTaste: item.rating_taste as number | null,
    ratingValue: item.rating_value as number | null,
    ratingService: item.rating_service as number | null,
    ratingAtmosphere: item.rating_atmosphere as number | null,
    ratingCleanliness: item.rating_cleanliness as number | null,
    ratingPortion: item.rating_portion as number | null,
    ratingBalance: item.rating_balance as number | null,
    ratingDifficulty: item.rating_difficulty as number | null,
    ratingTimeSpent: item.rating_time_spent as number | null,
    ratingReproducibility: item.rating_reproducibility as number | null,
    ratingPlating: item.rating_plating as number | null,
    ratingMaterialCost: item.rating_material_cost as number | null,
    comment: item.comment as string | null,
    tags: (item.tags as string[]) ?? [],
    flavorTags: (item.flavor_tags as string[]) ?? [],
    textureTags: (item.texture_tags as string[]) ?? [],
    atmosphereTags: (item.atmosphere_tags as string[]) ?? [],
    visibility: item.visibility as Visibility,
    aiRecognized: (item.ai_recognized as boolean) ?? false,
    completenessScore: (item.completeness_score as number) ?? 0,
    locationLat: item.location_lat as number | null,
    locationLng: item.location_lng as number | null,
    pricePerPerson: item.price_per_person as number | null,
    phaseStatus: (item.phase_status as number) ?? 1,
    phase1CompletedAt: item.phase1_completed_at as string | null,
    phase2CompletedAt: item.phase2_completed_at as string | null,
    phase3CompletedAt: item.phase3_completed_at as string | null,
    scaledRating: item.scaled_rating as number | null,
    comparisonCount: (item.comparison_count as number) ?? 0,
    scene: item.scene as string | null,
    pairingFood: item.pairing_food as string | null,
    purchasePrice: item.purchase_price as number | null,
    visitTime: item.visit_time as string | null,
    companionCount: item.companion_count as number | null,
    totalCost: item.total_cost as number | null,
    createdAt: item.created_at as string,
    photos: ((item.record_photos as Array<Record<string, unknown>>) ?? []).map((p) => ({
      id: p.id as string,
      recordId: p.record_id as string,
      photoUrl: p.photo_url as string,
      thumbnailUrl: p.thumbnail_url as string | null,
      orderIndex: p.order_index as number,
      aiLabels: (p.ai_labels as string[]) ?? [],
      cropData: (p.crop_data as RecordPhoto["cropData"]) ?? null,
    })),
    restaurant: item.restaurants
      ? { name: (item.restaurants as Record<string, unknown>).name as string, address: (item.restaurants as Record<string, unknown>).address as string | null }
      : null,
  }
}

export function useDiscover() {
  const [results, setResults] = useState<RecordWithPhotos[]>([])
  const [trending, setTrending] = useState<RecordWithPhotos[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const supabase = createClient()

  // 초기 로드: 인기 공개 기록 (cold start & 기본 브라우징)
  useEffect(() => {
    const loadTrending = async () => {
      const { data } = await supabase
        .from("records")
        .select("*, record_photos(*), restaurants(name, address)")
        .eq("visibility", "public")
        .not("record_photos", "is", null)
        .order("rating_overall", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(20)

      if (data) {
        // 사진이 있는 기록만 필터링
        const withPhotos = data.filter((item) => {
          const photos = item.record_photos as unknown[]
          return photos && photos.length > 0
        })
        setTrending(withPhotos.map((item) => mapRecord(item as Record<string, unknown>)))
      }
    }
    loadTrending()
  }, [supabase])

  const search = useCallback(async (query: string, filters?: { genre?: string; scene?: string }) => {
    setHasSearched(true)
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
    setResults((data ?? []).map((item) => mapRecord(item as Record<string, unknown>)))
    setIsSearching(false)
  }, [supabase])

  return { results, trending, isSearching, hasSearched, search }
}
