"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import type { RecordWithPhotos } from "@/domain/entities/record"

export function useTodaysPick(userId: string | null) {
  const supabase = createClient()

  const { data, isLoading } = useSWR(
    userId ? `todays-pick-${userId}` : null,
    async (): Promise<RecordWithPhotos | null> => {
      if (!userId) return null

      // Get a random recent record with photos
      const { data: records } = await supabase
        .from("records")
        .select("*, record_photos(*), restaurants(name, address)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (!records?.length) return null

      const withPhotos = records.filter(
        (r) => (r.record_photos as unknown[])?.length > 0,
      )

      const picked = withPhotos.length > 0
        ? withPhotos[Math.floor(Math.random() * withPhotos.length)]
        : records[0]

      const photos = ((picked.record_photos as Array<Record<string, unknown>>) ?? [])
        .map((p) => ({
          id: p.id as string,
          recordId: p.record_id as string,
          photoUrl: p.photo_url as string,
          thumbnailUrl: p.thumbnail_url as string | null,
          orderIndex: p.order_index as number,
          aiLabels: (p.ai_labels as string[]) ?? [],
        }))
        .sort((a, b) => a.orderIndex - b.orderIndex)

      const restaurant = picked.restaurants
        ? { name: (picked.restaurants as Record<string, unknown>).name as string, address: (picked.restaurants as Record<string, unknown>).address as string | null }
        : null

      return {
        id: picked.id,
        userId: picked.user_id,
        restaurantId: picked.restaurant_id,
        recordType: picked.record_type,
        menuName: picked.menu_name,
        genre: picked.genre,
        subGenre: picked.sub_genre,
        ratingOverall: picked.rating_overall,
        ratingTaste: picked.rating_taste,
        ratingValue: picked.rating_value,
        ratingService: picked.rating_service,
        ratingAtmosphere: picked.rating_atmosphere,
        ratingCleanliness: picked.rating_cleanliness,
        ratingPortion: picked.rating_portion,
        ratingBalance: picked.rating_balance,
        ratingDifficulty: picked.rating_difficulty,
        ratingTimeSpent: picked.rating_time_spent,
        ratingReproducibility: picked.rating_reproducibility,
        ratingPlating: picked.rating_plating,
        ratingMaterialCost: picked.rating_material_cost,
        comment: picked.comment,
        tags: picked.tags ?? [],
        flavorTags: picked.flavor_tags ?? [],
        textureTags: picked.texture_tags ?? [],
        atmosphereTags: picked.atmosphere_tags ?? [],
        visibility: picked.visibility,
        aiRecognized: picked.ai_recognized,
        completenessScore: picked.completeness_score,
        locationLat: picked.location_lat,
        locationLng: picked.location_lng,
        pricePerPerson: picked.price_per_person,
        phaseStatus: picked.phase_status,
        phase1CompletedAt: picked.phase1_completed_at,
        phase2CompletedAt: picked.phase2_completed_at,
        phase3CompletedAt: picked.phase3_completed_at,
        scaledRating: picked.scaled_rating,
        comparisonCount: picked.comparison_count,
        scene: picked.scene,
        pairingFood: picked.pairing_food,
        purchasePrice: picked.purchase_price,
        visitTime: picked.visit_time,
        companionCount: picked.companion_count,
        totalCost: picked.total_cost,
        createdAt: picked.created_at,
        photos,
        restaurant,
      }
    },
    { revalidateOnFocus: false },
  )

  return { pick: data ?? null, isLoading }
}
