"use client"

import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import type { RecordWithPhotos } from "@/domain/entities/record"

interface ReasonPreset {
  key: string
  text: string
  filter: (record: RecordWithPhotos, tasteDnaTopAxis: string | null) => boolean
}

export interface PickReason {
  key: string
  text: string
}

export interface TodaysPickResult {
  pick: RecordWithPhotos | null
  reason: PickReason | null
  refresh: () => void
  isLoading: boolean
}

const TIME_GENRES: Record<string, string[]> = {
  morning: ["cafe", "salad", "lunchbox"],
  lunch: ["korean", "japanese", "snack", "stew", "lunchbox", "katsu"],
  afternoon: ["cafe"],
  dinner: ["bbq", "western", "chinese", "seafood", "korean"],
  latenight: ["chicken", "jokbal", "asian", "snack"],
}

function getTimeSlot(): string {
  const hour = new Date().getHours()
  if (hour < 10) return "morning"
  if (hour < 14) return "lunch"
  if (hour < 17) return "afternoon"
  if (hour < 21) return "dinner"
  return "latenight"
}

function buildReasonPresets(timeSlot: string): ReasonPreset[] {
  const genres = TIME_GENRES[timeSlot] ?? []
  const genreLabel = genres[0] ?? ""

  return [
    {
      key: "high_rating",
      text: "만족도가 높았어요",
      filter: (r) => (r.ratingOverall ?? 0) >= 80,
    },
    {
      key: "genre_match",
      text: `${genreLabel} 맛집`,
      filter: (r) => r.genre != null && genres.includes(r.genre),
    },
    {
      key: "long_ago",
      text: "오래 안 갔던 곳",
      filter: (r) => {
        const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000
        return new Date(r.createdAt).getTime() < twoMonthsAgo
      },
    },
    {
      key: "dna_match",
      text: "이 맛 좋아할걸",
      filter: (r, topAxis) => {
        if (!topAxis) return false
        const axisToTag: Record<string, string[]> = {
          spicy: ["매운", "spicy", "辣"],
          sweet: ["달콤", "sweet"],
          salty: ["짭짤", "salty"],
          sour: ["새콤", "sour"],
          umami: ["감칠맛", "umami"],
          rich: ["풍미", "rich", "진한"],
        }
        const keywords = axisToTag[topAxis] ?? []
        const allTags = [...r.flavorTags, ...r.textureTags].map((t) => t.toLowerCase())
        return keywords.some((kw) => allTags.some((t) => t.includes(kw)))
      },
    },
    {
      key: "random",
      text: "오늘의 추천",
      filter: () => true,
    },
  ]
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function useTodaysPick(userId: string | null, tasteDnaTopAxis: string | null = null): TodaysPickResult {
  const supabase = createClient()
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: allRecords, isLoading } = useSWR(
    userId ? `todays-pick-records-${userId}` : null,
    async (): Promise<RecordWithPhotos[]> => {
      if (!userId) return []

      const { data: records } = await supabase
        .from("records")
        .select("*, record_photos(*), restaurants(name, address)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (!records?.length) return []

      return records.map((picked) => {
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
      })
    },
    { revalidateOnFocus: false },
  )

  const result = useMemo(() => {
    const records = allRecords ?? []
    // 기록 0건이면 콜드 스타트
    if (records.length === 0) return { pick: null, reason: null }

    const timeSlot = getTimeSlot()
    const genres = TIME_GENRES[timeSlot] ?? []

    // 사진 있는 기록 우선
    const withPhotos = records.filter((r) => r.photos.length > 0)
    const basePool = withPhotos.length > 0 ? withPhotos : records

    // 시간대 장르 필터
    const genreFiltered = basePool.filter((r) => r.genre != null && genres.includes(r.genre))

    // 프리셋을 랜덤 순서로 시도 — 시간대 필터된 풀 → 전체 풀 순서로 폴백
    const presets = buildReasonPresets(timeSlot)
    const shuffledPresets = shuffle(presets)

    // Phase 1: 시간대 장르 필터 + 프리셋
    if (genreFiltered.length > 0) {
      for (const preset of shuffledPresets) {
        const matched = genreFiltered.filter((r) => preset.filter(r, tasteDnaTopAxis))
        if (matched.length > 0) {
          const pick = matched[Math.floor(Math.random() * matched.length)]
          return { pick, reason: { key: preset.key, text: preset.text } }
        }
      }
      // 장르 매칭은 되지만 프리셋 조건 불일치 → 장르 풀에서 랜덤
      const pick = genreFiltered[Math.floor(Math.random() * genreFiltered.length)]
      return { pick, reason: { key: "genre_match", text: `${pick.genre ?? "맛있는"} 맛집` } }
    }

    // Phase 2: 시간대 장르 없음 → 전체 풀에서 프리셋 시도
    for (const preset of shuffledPresets) {
      const matched = basePool.filter((r) => preset.filter(r, tasteDnaTopAxis))
      if (matched.length > 0) {
        const pick = matched[Math.floor(Math.random() * matched.length)]
        return { pick, reason: { key: preset.key, text: preset.text } }
      }
    }

    // Phase 3: 최종 폴백 — 전체에서 랜덤
    const pick = basePool[Math.floor(Math.random() * basePool.length)]
    return { pick, reason: { key: "random", text: "오늘의 추천" } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRecords, tasteDnaTopAxis, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return {
    pick: result.pick,
    reason: result.reason,
    refresh,
    isLoading,
  }
}
