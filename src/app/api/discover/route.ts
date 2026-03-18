import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { searchRestaurantsByKeyword } from "@/infrastructure/api/kakao-local"
import { SupabaseDiscoverRepository } from "@/infrastructure/repositories/supabase-discover-repository"
import {
  calculateFinalScore,
  generateReason,
  getTopTasteAxis,
  inferGenreFromCategory,
} from "@/domain/services/discover-scoring"
import type { CandidateRaw, DiscoverResult, TasteProfileAxis } from "@/domain/entities/discover"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"

/**
 * GET /api/discover?area=성수&scene=데이트&genre=japanese
 *
 * Phase 1 MVP: Filter-based discover (realtime, no cache).
 * Pipeline: Kakao search → Internal DB enrichment → DNA personalization → Template reason
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const area = searchParams.get("area")
  const sceneParam = searchParams.get("scene")
  const scene = sceneParam?.split(",")[0] ?? null
  const genre = searchParams.get("genre")

  if (!area && !scene) {
    return NextResponse.json(
      { error: "area 또는 scene 중 최소 1개가 필요합니다" },
      { status: 400 },
    )
  }

  try {
    const repo = new SupabaseDiscoverRepository(supabase)

    // --- Step 2: Build candidate pool (Kakao API + Internal DB) ---
    const genreLabel = genre
      ? FOOD_CATEGORIES.find((c) => c.value === genre)?.label ?? genre
      : ""
    const searchQuery = [area, genreLabel, "맛집"].filter(Boolean).join(" ")
    const kakaoResults = await searchRestaurantsByKeyword(searchQuery)

    if (kakaoResults.length === 0) {
      return NextResponse.json({
        success: true,
        source: "realtime",
        computedAt: new Date().toISOString(),
        results: [],
        filters: { area, scene, genre },
        cacheStatus: "ready",
      })
    }

    const externalIds = kakaoResults.map((r) => r.externalId)

    // Parallel: internal DB enrichment + user data + blacklist + seed prefs
    const [
      internalCandidates,
      visitedSet,
      recordCount,
      blacklisted,
      tasteDnaResult,
      styleDnaResult,
      seedGenres,
    ] = await Promise.all([
      repo.getInternalCandidates(externalIds),
      repo.getUserVisitedRestaurants(user.id, externalIds),
      repo.getUserRecordCount(user.id),
      repo.getBlacklistedRestaurants(user.id),
      fetchTasteDna(supabase, user.id),
      fetchStyleDna(supabase, user.id),
      fetchSeedGenres(supabase, user.id),
    ])

    const internalMap = new Map(internalCandidates.map((c) => [c.externalId, c]))

    // Merge into CandidateRaw[]
    const candidates: CandidateRaw[] = kakaoResults
      .filter((k) => !blacklisted.has(k.externalId))
      .map((k) => {
        const internal = internalMap.get(k.externalId)
        return {
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
        }
      })

    // --- Step 5: DNA personalization ---
    const userTasteDna = tasteDnaResult
    const topTasteAxis = getTopTasteAxis(userTasteDna)
    const frequentAreas = styleDnaResult?.areas.slice(0, 5).map((a) => a.area) ?? []

    // --- Scoring log header ---
    console.log("\n[Discover] ═══════════════════════════════════════")
    console.log(`[Discover] Query: area=${area} scene=${scene} genre=${genre}`)
    console.log(`[Discover] User: records=${recordCount} tasteDna=${userTasteDna ? "real" : "none"} seedGenres=[${seedGenres.join(",")}]`)
    console.log(`[Discover] Candidates: ${candidates.length} (blacklisted ${blacklisted.size}, kakao ${kakaoResults.length})`)

    const scored = candidates.map((candidate) => {
      const candidateGenre = inferGenreFromCategory(candidate.category)
        ?? internalMap.get(candidate.kakaoId)?.genre
        ?? genre
        ?? null
      const isNew = !visitedSet.has(candidate.kakaoId)

      const { scores, dominantFactor, debug } = calculateFinalScore({
        candidate,
        userTasteDna,
        userStyleDna: styleDnaResult,
        userRecordCount: recordCount,
        scene,
        candidateGenre,
        isNewForUser: isNew,
        seedGenres,
      })

      const isFrequentArea = frequentAreas.some((fa) =>
        candidate.address.includes(fa) || candidate.roadAddress.includes(fa),
      )

      const reason = generateReason(candidate, dominantFactor, {
        scene, area, candidateGenre, topTasteAxis, isFrequentArea,
      })

      return { candidate, scores, reason, candidateGenre, isNew, dominantFactor, debug }
    })

    // Sort by overall score descending
    scored.sort((a, b) => b.scores.overall - a.scores.overall)

    // Ensure at least 1 novelty pick in top 5
    const top5 = scored.slice(0, 5)
    const hasNovelty = top5.some((s) => s.isNew)
    if (!hasNovelty) {
      const noveltyPick = scored.find((s) => s.isNew && !top5.includes(s))
      if (noveltyPick) {
        top5[top5.length - 1] = noveltyPick
      }
    }

    // --- Scoring log detail ---
    console.log(`[Discover] Weights: taste=${top5[0]?.debug.weights.taste} style=${top5[0]?.debug.weights.style} quality=${top5[0]?.debug.weights.quality} novelty=${top5[0]?.debug.weights.novelty}`)
    console.log(`[Discover] TasteDNA source: ${top5[0]?.debug.tasteSource}`)
    console.log("[Discover] ───────────────────────────────────────")
    console.log("[Discover]  #  Score  Taste  Style  Qual  Novel  Genre       Dominant  Name")
    for (const s of top5) {
      const d = s.debug
      const g = (d.candidateGenre ?? "?").padEnd(10)
      console.log(
        `[Discover]  ${top5.indexOf(s) + 1}  ` +
        `${String(s.scores.overall).padStart(4)}   ` +
        `${String(d.rawScores.taste).padStart(4)}   ` +
        `${String(d.rawScores.style).padStart(4)}   ` +
        `${String(d.rawScores.quality).padStart(4)}   ` +
        `${String(d.rawScores.novelty).padStart(4)}   ` +
        `${g}  ${s.dominantFactor.padEnd(8)}  ${s.candidate.name}`,
      )
    }
    if (scored.length > 5) {
      console.log(`[Discover]  ... +${scored.length - 5} more candidates (scores ${scored[5]?.scores.overall}~${scored[scored.length - 1]?.scores.overall})`)
    }
    console.log("[Discover] ═══════════════════════════════════════\n")

    // --- Step 6: Package results ---
    const results: DiscoverResult[] = top5.map((s, i) => ({
      rank: i + 1,
      restaurant: {
        name: s.candidate.name,
        address: s.candidate.roadAddress || s.candidate.address,
        genre: s.candidateGenre ?? "other",
        kakaoId: s.candidate.kakaoId,
        kakaoUrl: s.candidate.kakaoUrl,
        photo: s.candidate.imageUrl,
        phone: s.candidate.phone,
        hours: s.candidate.hours,
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
      highlights: buildHighlights(s.candidate),
      internalRecordCount: s.candidate.internalRecordCount,
      hasVisited: visitedSet.has(s.candidate.kakaoId),
      sourceCount: s.candidate.internalRecordCount > 0 ? 2 : 1,
    }))

    return NextResponse.json({
      success: true,
      source: "realtime",
      computedAt: new Date().toISOString(),
      results,
      filters: { area, scene, genre },
      cacheStatus: "ready",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Discover API] Error:", message)
    return NextResponse.json({ error: `검색 실패: ${message}` }, { status: 500 })
  }
}

// --- Helper functions ---

async function fetchTasteDna(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

async function fetchStyleDna(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{
  areas: Array<{ area: string; recordCount: number }>
  scenes: Array<{ scene: string; recordCount: number }>
  genres: Array<{ genre: string; recordCount: number }>
} | null> {
  const [areasResult, scenesResult, genresResult] = await Promise.all([
    supabase
      .from("style_dna_restaurant_areas")
      .select("area, record_count")
      .eq("user_id", userId)
      .order("record_count", { ascending: false })
      .limit(10),
    supabase
      .from("style_dna_restaurant_scenes")
      .select("scene, record_count")
      .eq("user_id", userId)
      .order("record_count", { ascending: false })
      .limit(10),
    supabase
      .from("style_dna_restaurant_genres")
      .select("genre, record_count")
      .eq("user_id", userId)
      .order("record_count", { ascending: false })
      .limit(10),
  ])

  const areas = (areasResult.data ?? []).map((d) => ({
    area: d.area as string,
    recordCount: d.record_count as number,
  }))
  const scenes = (scenesResult.data ?? []).map((d) => ({
    scene: d.scene as string,
    recordCount: d.record_count as number,
  }))
  const genres = (genresResult.data ?? []).map((d) => ({
    genre: d.genre as string,
    recordCount: d.record_count as number,
  }))

  if (areas.length === 0 && scenes.length === 0 && genres.length === 0) return null
  return { areas, scenes, genres }
}

async function fetchSeedGenres(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("discover_preferences")
    .select("seed_genres")
    .eq("user_id", userId)
    .single()
  return (data?.seed_genres as string[] | null) ?? []
}

function buildHighlights(candidate: CandidateRaw): string[] {
  const highlights: string[] = []

  if (candidate.internalRecordCount > 0) {
    highlights.push(`Nyam 기록 ${candidate.internalRecordCount}건`)
  }
  if (candidate.internalRating && candidate.internalRating >= 80) {
    highlights.push(`평점 ${candidate.internalRating}`)
  }
  if (candidate.flavorTags.length > 0) {
    highlights.push(candidate.flavorTags.slice(0, 2).join(", "))
  }

  return highlights.slice(0, 3)
}
