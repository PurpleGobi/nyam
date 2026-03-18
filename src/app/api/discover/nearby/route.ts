import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { searchNearbyRestaurants } from "@/infrastructure/api/kakao-local"
import { SupabaseDiscoverRepository } from "@/infrastructure/repositories/supabase-discover-repository"
import {
  calculateFinalScore,
  generateReason,
  getTopTasteAxis,
  inferGenreFromCategory,
} from "@/domain/services/discover-scoring"
import type { CandidateRaw, DiscoverResult, TasteProfileAxis } from "@/domain/entities/discover"

/**
 * GET /api/discover/nearby?lat=37.5445&lng=127.0567&radius=500&scene=혼밥&genre=japanese
 *
 * GPS-based realtime search. No LLM calls (speed priority).
 * Target: < 1.5 seconds response time.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get("lat"))
  const lng = Number(searchParams.get("lng"))
  const radius = Number(searchParams.get("radius")) || 500
  const scene = searchParams.get("scene")
  const genre = searchParams.get("genre")

  if (searchParams.get("lat") === null || searchParams.get("lng") === null || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat, lng 좌표가 필요합니다" }, { status: 400 })
  }

  try {
    const repo = new SupabaseDiscoverRepository(supabase)

    // Step 2: Kakao nearby search (no LLM)
    const kakaoResults = await searchNearbyRestaurants(lat, lng, Math.min(radius, 2000))

    if (kakaoResults.length === 0) {
      return NextResponse.json({
        success: true,
        source: "realtime",
        computedAt: new Date().toISOString(),
        results: [],
        filters: { area: null, scene, genre },
        cacheStatus: "ready",
      })
    }

    const externalIds = kakaoResults.map((r) => r.externalId)

    // Parallel fetches
    const [internalCandidates, visitedSet, recordCount, blacklisted, tasteDna, styleDna, seedGenres] = await Promise.all([
      repo.getInternalCandidates(externalIds),
      repo.getUserVisitedRestaurants(user.id, externalIds),
      repo.getUserRecordCount(user.id),
      repo.getBlacklistedRestaurants(user.id),
      fetchTasteDna(supabase, user.id),
      fetchStyleDnaLight(supabase, user.id),
      fetchSeedGenres(supabase, user.id),
    ])

    const internalMap = new Map(internalCandidates.map((c) => [c.externalId, c]))
    const topTasteAxis = getTopTasteAxis(tasteDna)

    // Merge and filter
    const candidates = kakaoResults
      .filter((k) => !blacklisted.has(k.externalId))
      .filter((k) => {
        if (!genre) return true
        const inferred = inferGenreFromCategory(k.categoryName)
        return inferred === genre || internalMap.get(k.externalId)?.genre === genre
      })
      .map((k) => {
        const internal = internalMap.get(k.externalId)
        const candidate: CandidateRaw & { distance: number } = {
          kakaoId: k.externalId,
          name: k.name,
          address: k.addressName,
          roadAddress: k.address,
          lat: k.latitude,
          lng: k.longitude,
          phone: k.phone || null,
          kakaoUrl: k.placeUrl,
          category: k.categoryName,
          hours: null,
          menuItems: [],
          imageUrl: null,
          internalRating: internal?.avgRating ?? null,
          internalRecordCount: internal?.recordCount ?? 0,
          tasteProfile: internal?.tasteProfile ?? null,
          flavorTags: internal?.flavorTags ?? [],
          textureTags: internal?.textureTags ?? [],
          atmosphereTags: internal?.atmosphereTags ?? [],
          distance: k.distance,
        }
        return candidate
      })

    // Score and rank
    const scored = candidates.map((candidate) => {
      const candidateGenre = inferGenreFromCategory(candidate.category)
        ?? internalMap.get(candidate.kakaoId)?.genre
        ?? genre
        ?? null
      const isNew = !visitedSet.has(candidate.kakaoId)

      const { scores, dominantFactor } = calculateFinalScore({
        candidate,
        userTasteDna: tasteDna,
        userStyleDna: styleDna,
        userRecordCount: recordCount,
        scene,
        candidateGenre,
        isNewForUser: isNew,
        seedGenres,
      })

      // Distance-based reason for nearby
      const distanceStr = candidate.distance < 100
        ? `${candidate.distance}m 거리`
        : `${Math.round(candidate.distance / 100) * 100}m`
      const baseReason = generateReason(candidate, dominantFactor, {
        scene, area: null, candidateGenre, topTasteAxis, isFrequentArea: false,
      })
      const reason = `여기서 ${distanceStr}, ${baseReason}`

      return { candidate, scores, reason, candidateGenre, isNew }
    })

    scored.sort((a, b) => b.scores.overall - a.scores.overall)

    const top5 = scored.slice(0, 5)

    const results: DiscoverResult[] = top5.map((s, i) => ({
      rank: i + 1,
      restaurant: {
        name: s.candidate.name,
        address: s.candidate.roadAddress || s.candidate.address,
        genre: s.candidateGenre ?? "other",
        kakaoId: s.candidate.kakaoId,
        kakaoUrl: s.candidate.kakaoUrl,
        photo: null,
        phone: s.candidate.phone,
        hours: null,
      },
      practicalInfo: {
        parking: null,
        reservation: null,
        waiting: null,
        priceRange: null,
        popularMenus: [],
      },
      scores: s.scores,
      reason: s.reason,
      highlights: [],
      internalRecordCount: s.candidate.internalRecordCount,
      hasVisited: visitedSet.has(s.candidate.kakaoId),
      sourceCount: s.candidate.internalRecordCount > 0 ? 2 : 1,
      distance: s.candidate.distance,
    }))

    return NextResponse.json({
      success: true,
      source: "realtime",
      computedAt: new Date().toISOString(),
      results,
      filters: { area: null, scene, genre },
      cacheStatus: "ready",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Discover Nearby] Error:", message)
    return NextResponse.json({ error: `검색 실패: ${message}` }, { status: 500 })
  }
}

async function fetchTasteDna(
  supabase: Awaited<ReturnType<typeof import("@/infrastructure/supabase/server").createClient>>,
  userId: string,
): Promise<TasteProfileAxis | null> {
  const { data } = await supabase
    .from("taste_dna_restaurant")
    .select("flavor_spicy, flavor_sweet, flavor_salty, flavor_sour, flavor_umami, flavor_rich")
    .eq("user_id", userId)
    .single()

  if (!data) return null
  return {
    spicy: data.flavor_spicy as number,
    sweet: data.flavor_sweet as number,
    salty: data.flavor_salty as number,
    sour: data.flavor_sour as number,
    umami: data.flavor_umami as number,
    rich: data.flavor_rich as number,
  }
}

async function fetchStyleDnaLight(
  supabase: Awaited<ReturnType<typeof import("@/infrastructure/supabase/server").createClient>>,
  userId: string,
) {
  const [areasResult, scenesResult, genresResult] = await Promise.all([
    supabase
      .from("style_dna_restaurant_areas")
      .select("area, record_count")
      .eq("user_id", userId)
      .order("record_count", { ascending: false })
      .limit(5),
    supabase
      .from("style_dna_restaurant_scenes")
      .select("scene, record_count")
      .eq("user_id", userId)
      .order("record_count", { ascending: false })
      .limit(5),
    supabase
      .from("style_dna_restaurant_genres")
      .select("genre, record_count")
      .eq("user_id", userId)
      .order("record_count", { ascending: false })
      .limit(5),
  ])

  const areas = (areasResult.data ?? []).map((d) => ({ area: d.area as string, recordCount: d.record_count as number }))
  const scenes = (scenesResult.data ?? []).map((d) => ({ scene: d.scene as string, recordCount: d.record_count as number }))
  const genres = (genresResult.data ?? []).map((d) => ({ genre: d.genre as string, recordCount: d.record_count as number }))

  if (areas.length === 0 && scenes.length === 0 && genres.length === 0) return null
  return { areas, scenes, genres }
}

async function fetchSeedGenres(
  supabase: Awaited<ReturnType<typeof import("@/infrastructure/supabase/server").createClient>>,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("discover_preferences")
    .select("seed_genres")
    .eq("user_id", userId)
    .single()
  return (data?.seed_genres as string[] | null) ?? []
}
