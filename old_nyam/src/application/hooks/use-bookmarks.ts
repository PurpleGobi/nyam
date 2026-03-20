"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import type { RecordPhoto, RecordWithPhotos } from "@/domain/entities/record"

export interface Bookmark {
  userId: string
  recordId: string
  createdAt: string
}

export interface BookmarkWithRecord extends Bookmark {
  record: RecordWithPhotos
}

function mapDbRecordFromBookmark(record: Record<string, unknown>): RecordWithPhotos {
  const photos = ((record.record_photos as Record<string, unknown>[]) ?? [])
    .map((p) => ({
      id: p.id as string,
      recordId: p.record_id as string,
      photoUrl: p.photo_url as string,
      thumbnailUrl: p.thumbnail_url as string | null,
      orderIndex: p.order_index as number,
      aiLabels: (p.ai_labels as string[]) ?? [],
      cropData: (p.crop_data as RecordPhoto["cropData"]) ?? null,
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const restaurant = record.restaurants
    ? {
      name: (record.restaurants as Record<string, unknown>).name as string,
      address: (record.restaurants as Record<string, unknown>).address as string | null,
    }
    : null

  return {
    id: record.id as string,
    userId: record.user_id as string,
    restaurantId: record.restaurant_id as string | null,
    recordType: record.record_type as RecordWithPhotos["recordType"],
    menuName: record.menu_name as string | null,
    genre: record.genre as string | null,
    subGenre: record.sub_genre as string | null,
    ratingOverall: record.rating_overall as number | null,
    ratingTaste: record.rating_taste as number | null,
    ratingValue: record.rating_value as number | null,
    ratingService: record.rating_service as number | null,
    ratingAtmosphere: record.rating_atmosphere as number | null,
    ratingCleanliness: record.rating_cleanliness as number | null,
    ratingPortion: record.rating_portion as number | null,
    ratingBalance: record.rating_balance as number | null,
    ratingDifficulty: record.rating_difficulty as number | null,
    ratingTimeSpent: record.rating_time_spent as number | null,
    ratingReproducibility: record.rating_reproducibility as number | null,
    ratingPlating: record.rating_plating as number | null,
    ratingMaterialCost: record.rating_material_cost as number | null,
    comment: record.comment as string | null,
    tags: (record.tags as string[]) ?? [],
    flavorTags: (record.flavor_tags as string[]) ?? [],
    textureTags: (record.texture_tags as string[]) ?? [],
    atmosphereTags: (record.atmosphere_tags as string[]) ?? [],
    visibility: record.visibility as RecordWithPhotos["visibility"],
    aiRecognized: record.ai_recognized as boolean,
    completenessScore: record.completeness_score as number,
    locationLat: record.location_lat as number | null,
    locationLng: record.location_lng as number | null,
    pricePerPerson: record.price_per_person as number | null,
    phaseStatus: record.phase_status as number,
    phase1CompletedAt: record.phase1_completed_at as string | null,
    phase2CompletedAt: record.phase2_completed_at as string | null,
    phase3CompletedAt: record.phase3_completed_at as string | null,
    scaledRating: record.scaled_rating as number | null,
    comparisonCount: record.comparison_count as number,
    scene: record.scene as string | null,
    pairingFood: record.pairing_food as string | null,
    purchasePrice: record.purchase_price as number | null,
    visitTime: record.visit_time as string | null,
    companionCount: record.companion_count as number | null,
    totalCost: record.total_cost as number | null,
    createdAt: record.created_at as string,
    photos,
    restaurant,
  }
}

export function useBookmarks() {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR<BookmarkWithRecord[]>(
    "bookmarks",
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: rows, error: fetchError } = await supabase
        .from("bookmarks")
        .select("*, records(*, record_photos(*), restaurants(name, address))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (fetchError) throw new Error(`Failed to fetch bookmarks: ${fetchError.message}`)

      return (rows ?? []).map((row) => ({
        userId: row.user_id as string,
        recordId: row.record_id as string,
        createdAt: row.created_at as string,
        record: mapDbRecordFromBookmark(row.records as Record<string, unknown>),
      }))
    },
  )

  const bookmarkedRecordIds = new Set((data ?? []).map((b) => b.recordId))

  return {
    bookmarks: data ?? [],
    bookmarkedRecordIds,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  }
}
