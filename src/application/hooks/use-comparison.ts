"use client"

import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import type { RecordWithPhotos } from "@/domain/entities/record"

interface Matchup {
  recordA: RecordWithPhotos
  recordB: RecordWithPhotos
}

interface ComparisonResult {
  winnerId: string
  rankings: Array<{ recordId: string; rank: number }>
}

/**
 * Manages Phase 3 comparison tournament.
 * Given N records, runs single-elimination rounds to determine a winner.
 */
export function useComparison(userId: string | null) {
  const supabase = createClient()

  const { data, isLoading } = useSWR<RecordWithPhotos[]>(
    userId ? `comparison-candidates/${userId}` : null,
    async () => {
      if (!userId) return []

      const { data: records } = await supabase
        .from("records")
        .select("*, record_photos(*), restaurants(name, address)")
        .eq("user_id", userId)
        .gte("phase_status", 2)
        .order("created_at", { ascending: false })
        .limit(16)

      return (records ?? []).map((item) => mapRecord(item))
    },
  )

  const records = useMemo(() => data ?? [], [data])

  const [bracket, setBracket] = useState<RecordWithPhotos[]>([])
  const [matchIndex, setMatchIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [winners, setWinners] = useState<RecordWithPhotos[]>([])
  const [result, setResult] = useState<ComparisonResult | null>(null)

  const totalRounds = bracket.length > 0 ? Math.ceil(Math.log2(bracket.length)) : 0

  const currentMatchup: Matchup | null =
    bracket.length >= 2 && matchIndex * 2 + 1 < bracket.length
      ? { recordA: bracket[matchIndex * 2], recordB: bracket[matchIndex * 2 + 1] }
      : null

  const startComparison = useCallback(
    (selectedRecords?: RecordWithPhotos[]) => {
      const candidates = selectedRecords ?? records
      if (candidates.length < 2) return

      setBracket(candidates)
      setMatchIndex(0)
      setRound(1)
      setWinners([])
      setResult(null)
    },
    [records],
  )

  const selectWinner = useCallback(
    (winnerId: string) => {
      const winner = bracket.find((r) => r.id === winnerId)
      if (!winner) return

      const nextWinners = [...winners, winner]
      const nextMatchIndex = matchIndex + 1

      // Check if there's an odd record left without a pair
      if (nextMatchIndex * 2 >= bracket.length) {
        // Handle odd record: auto-advance if unpaired
        let roundWinners = nextWinners
        if (bracket.length % 2 !== 0) {
          roundWinners = [...nextWinners, bracket[bracket.length - 1]]
        }

        if (roundWinners.length === 1) {
          // Tournament complete
          setResult({
            winnerId: roundWinners[0].id,
            rankings: roundWinners.map((r, i) => ({ recordId: r.id, rank: i + 1 })),
          })
          return
        }

        // Start next round
        setBracket(roundWinners)
        setWinners([])
        setMatchIndex(0)
        setRound((prev) => prev + 1)
      } else {
        setWinners(nextWinners)
        setMatchIndex(nextMatchIndex)
      }
    },
    [bracket, winners, matchIndex],
  )

  return {
    records,
    currentMatchup,
    round,
    totalRounds,
    selectWinner,
    result,
    isLoading,
    startComparison,
  }
}

function mapRecord(item: Record<string, unknown>): RecordWithPhotos {
  return {
    id: item.id as string,
    userId: item.user_id as string,
    restaurantId: item.restaurant_id as string | null,
    recordType: item.record_type as RecordWithPhotos["recordType"],
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
    visibility: item.visibility as RecordWithPhotos["visibility"],
    aiRecognized: item.ai_recognized as boolean,
    completenessScore: item.completeness_score as number,
    locationLat: item.location_lat as number | null,
    locationLng: item.location_lng as number | null,
    pricePerPerson: item.price_per_person as number | null,
    phaseStatus: item.phase_status as number,
    phase1CompletedAt: item.phase1_completed_at as string | null,
    phase2CompletedAt: item.phase2_completed_at as string | null,
    phase3CompletedAt: item.phase3_completed_at as string | null,
    scaledRating: item.scaled_rating as number | null,
    comparisonCount: item.comparison_count as number,
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
    })),
    restaurant: item.restaurants
      ? {
          name: (item.restaurants as Record<string, unknown>).name as string,
          address: (item.restaurants as Record<string, unknown>).address as string | null,
        }
      : null,
  }
}
