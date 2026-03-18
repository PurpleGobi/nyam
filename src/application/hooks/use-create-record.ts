"use client"

import { useCallback, useState } from "react"
import { createClient } from "@/infrastructure/supabase/client"
import { uploadRecordPhoto } from "@/infrastructure/storage/image-upload"
import type { RecordType } from "@/infrastructure/supabase/types"
import type { NearbyPlace } from "@/infrastructure/api/kakao-local"
import { extractArea } from "@/shared/constants/areas"

interface CreateRecordData {
  recordType: RecordType
  photos: File[]
  restaurantId?: string
  selectedPlace?: NearbyPlace
  menuName?: string
  genre?: string
  scene?: string
  ratingTaste?: number
  ratingValue?: number
  ratingService?: number
  ratingAtmosphere?: number
  ratingCleanliness?: number
  ratingPortion?: number
  ratingBalance?: number
  ratingDifficulty?: number
  ratingTimeSpent?: number
  ratingReproducibility?: number
  ratingPlating?: number
  ratingMaterialCost?: number
  comment?: string
  flavorTags?: string[]
  textureTags?: string[]
  atmosphereTags?: string[]
  locationLat?: number
  locationLng?: number
  // Wine WSET tasting notes (user input, optional)
  wineAcidity?: number
  wineBody?: number
  wineTannin?: number
  wineSweetness?: number
  wineBalance?: number
  wineFinish?: number
  wineAroma?: number
  // Cooking manual flavor input (6-axis)
  flavorSpicy?: number
  flavorSweet?: number
  flavorSalty?: number
  flavorSour?: number
  flavorUmami?: number
  flavorRich?: number
}

export function useCreateRecord() {
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState("")

  const createRecord = useCallback(async (data: CreateRecordData): Promise<string> => {
    setIsCreating(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      setProgress("기록 저장 중...")

      // Resolve restaurant from selected place (select-or-insert)
      let resolvedRestaurantId = data.restaurantId ?? null
      if (data.selectedPlace) {
        // Try to find existing restaurant by source + external_id
        const { data: existing } = await supabase
          .from("restaurants")
          .select("id")
          .eq("source", "kakao")
          .eq("external_id", data.selectedPlace.externalId)
          .maybeSingle()

        if (existing) {
          resolvedRestaurantId = existing.id
        } else {
          const { data: created } = await supabase
            .from("restaurants")
            .insert({
              source: "kakao",
              external_id: data.selectedPlace.externalId,
              name: data.selectedPlace.name,
              address: data.selectedPlace.address,
              phone: data.selectedPlace.phone || null,
              latitude: data.selectedPlace.latitude,
              longitude: data.selectedPlace.longitude,
              external_url: data.selectedPlace.placeUrl || null,
              region: extractArea(data.selectedPlace.addressName),
            })
            .select("id")
            .single()

          if (created) {
            resolvedRestaurantId = created.id
          }
        }
      }

      // Calculate overall rating
      let ratingOverall: number | null = null
      if (data.recordType === "restaurant") {
        const ratings = [data.ratingTaste, data.ratingValue, data.ratingService, data.ratingAtmosphere, data.ratingCleanliness, data.ratingPortion]
        const valid = ratings.filter((r): r is number => r != null)
        ratingOverall = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
      } else if (data.recordType === "wine") {
        const ratings = [data.ratingTaste, data.ratingValue]
        const valid = ratings.filter((r): r is number => r != null)
        ratingOverall = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
      } else if (data.recordType === "cooking") {
        const ratings = [data.ratingBalance, data.ratingTaste]
        const valid = ratings.filter((r): r is number => r != null)
        ratingOverall = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
      }

      // Create record
      const { data: record, error } = await supabase
        .from("records")
        .insert({
          user_id: user.id,
          record_type: data.recordType,
          restaurant_id: resolvedRestaurantId,
          menu_name: data.menuName ?? null,
          genre: data.genre ?? null,
          scene: data.scene ?? null,
          rating_overall: ratingOverall,
          rating_taste: data.ratingTaste ?? null,
          rating_value: data.ratingValue ?? null,
          rating_service: data.ratingService ?? null,
          rating_atmosphere: data.ratingAtmosphere ?? null,
          rating_cleanliness: data.ratingCleanliness ?? null,
          rating_portion: data.ratingPortion ?? null,
          rating_balance: data.ratingBalance ?? null,
          rating_difficulty: data.ratingDifficulty ?? null,
          rating_time_spent: data.ratingTimeSpent ?? null,
          rating_reproducibility: data.ratingReproducibility ?? null,
          rating_plating: data.ratingPlating ?? null,
          rating_material_cost: data.ratingMaterialCost ?? null,
          comment: data.comment ?? null,
          flavor_tags: data.flavorTags ?? [],
          texture_tags: data.textureTags ?? [],
          atmosphere_tags: data.atmosphereTags ?? [],
          location_lat: data.locationLat ?? null,
          location_lng: data.locationLng ?? null,
          phase1_completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create record: ${error.message}`)

      // Upload photos
      if (data.photos.length > 0) {
        setProgress("사진 업로드 중...")
        const photoInserts = []
        for (let i = 0; i < data.photos.length; i++) {
          const { photoUrl, thumbnailUrl } = await uploadRecordPhoto(
            data.photos[i],
            user.id,
            record.id,
            i,
          )
          photoInserts.push({
            record_id: record.id,
            photo_url: photoUrl,
            thumbnail_url: thumbnailUrl,
            order_index: i,
          })
        }
        await supabase.from("record_photos").insert(photoInserts)
      }

      // Save wine WSET user tasting notes (source='pending_user', to be merged with AI later)
      const hasWset = data.recordType === "wine" && data.wineAcidity != null
      if (hasWset) {
        await supabase.from("record_taste_profiles").insert({
          record_id: record.id,
          wine_acidity_user: data.wineAcidity ?? null,
          wine_body_user: data.wineBody ?? null,
          wine_tannin_user: data.wineTannin ?? null,
          wine_sweetness_user: data.wineSweetness ?? null,
          wine_balance_user: data.wineBalance ?? null,
          wine_finish_user: data.wineFinish ?? null,
          wine_aroma_user: data.wineAroma ?? null,
          source: "pending_user",
        })
      }

      // Save manual taste profile for cooking (source='manual')
      const hasFlavor = data.recordType === "cooking" && data.flavorSpicy != null
      if (hasFlavor) {
        await supabase.from("record_taste_profiles").insert({
          record_id: record.id,
          spicy: data.flavorSpicy ?? null,
          sweet: data.flavorSweet ?? null,
          salty: data.flavorSalty ?? null,
          sour: data.flavorSour ?? null,
          umami: data.flavorUmami ?? null,
          rich: data.flavorRich ?? null,
          source: "manual",
        })
      }

      // Trigger async AI pipeline (fire and forget) — 5 steps
      setProgress("AI 분석 요청 중...")

      const runPipeline = async () => {
        const headers = { "Content-Type": "application/json" }
        const body = JSON.stringify({ recordId: record.id })
        try {
          // Step 1: identify (each API skips internally if not applicable)
          await fetch("/api/records/identify", { method: "POST", headers, body }).catch(() => {})
          // Step 2: enrich (Kakao data collection)
          await fetch("/api/records/enrich", { method: "POST", headers, body }).catch(() => {})
          // Step 3: analyze-photos
          await fetch("/api/records/analyze-photos", { method: "POST", headers, body }).catch(() => {})
          // Step 4: taste-profile
          await fetch("/api/records/taste-profile", { method: "POST", headers, body }).catch(() => {})
        } finally {
          // Step 5: post-process (always runs)
          await fetch("/api/records/post-process", { method: "POST", headers, body }).catch(console.error)
        }
      }
      runPipeline()

      return record.id
    } finally {
      setIsCreating(false)
      setProgress("")
    }
  }, [])

  return { createRecord, isCreating, progress }
}
