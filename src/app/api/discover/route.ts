import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { searchRestaurantsByKeyword } from "@/infrastructure/api/kakao-local"
import { callGemini } from "@/infrastructure/api/gemini"
import { SupabaseDiscoverRepository } from "@/infrastructure/repositories/supabase-discover-repository"
import {
  calculateFinalScore,
  getTopTasteAxis,
  inferGenreFromCategory,
} from "@/domain/services/discover-scoring"
import type { CandidateRaw, DiscoverResult, TasteProfileAxis } from "@/domain/entities/discover"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"

/** LLM recommendation item */
interface LlmRecommendation {
  name: string
  searchKeyword: string
  area: string
  genre: string | null
  reason: string
  confidence: "high" | "medium"
}

/**
 * GET /api/discover?area=성수&scene=데이트&genre=japanese&query=조용한 오마카세
 *
 * Pipeline: LLM recommendation → Kakao verification → Internal DB enrichment → DNA scoring
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
  const scenes = sceneParam?.split(",").filter(Boolean) ?? []
  const scene = scenes[0] ?? null
  const genre = searchParams.get("genre")
  const query = searchParams.get("query")

  if (!area && scenes.length === 0 && !query) {
    return NextResponse.json(
      { error: "area, scene, query 중 최소 1개가 필요합니다" },
      { status: 400 },
    )
  }

  try {
    const repo = new SupabaseDiscoverRepository(supabase)

    // --- Step 1: LLM Recommendation ---
    const genreLabel = genre
      ? FOOD_CATEGORIES.find((c) => c.value === genre)?.label ?? genre
      : null

    console.log("\n[Discover] ═══════════════════════════════════════")
    console.log(`[Discover] Step 1: LLM Recommendation`)
    console.log(`[Discover]   area=${area} scenes=[${scenes.join(",")}] genre=${genre} query="${query ?? ""}"`)

    const llmRecommendations = await getLlmRecommendations({
      area, scenes, genreLabel, query,
    })

    console.log(`[Discover]   LLM returned ${llmRecommendations.length} recommendations:`)
    for (const r of llmRecommendations) {
      console.log(`[Discover]     - ${r.name} (${r.area}, ${r.confidence}) keyword="${r.searchKeyword}"`)
    }

    // --- Step 2: Kakao Verification ---
    console.log(`[Discover] Step 2: Kakao Verification`)

    const verifiedCandidates = await verifyWithKakao(llmRecommendations)

    console.log(`[Discover]   Verified: ${verifiedCandidates.length}/${llmRecommendations.length}`)
    for (const v of verifiedCandidates) {
      console.log(`[Discover]     [OK] ${v.kakaoPlace.name} (kakaoId=${v.kakaoPlace.externalId})`)
    }

    // Fallback: if too few verified, supplement with keyword search
    if (verifiedCandidates.length < 3) {
      console.log(`[Discover]   Fallback: keyword search to supplement`)
      const fallbackQuery = [area, genreLabel, "맛집"].filter(Boolean).join(" ")
      const fallbackResults = await searchRestaurantsByKeyword(fallbackQuery)
      const existingIds = new Set(verifiedCandidates.map((v) => v.kakaoPlace.externalId))
      for (const r of fallbackResults) {
        if (!existingIds.has(r.externalId)) {
          verifiedCandidates.push({ kakaoPlace: r, llmReason: null })
          existingIds.add(r.externalId)
        }
      }
      console.log(`[Discover]   After fallback: ${verifiedCandidates.length} candidates`)
    }

    if (verifiedCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        source: "realtime",
        computedAt: new Date().toISOString(),
        results: [],
        filters: { area, scene, genre, query },
        cacheStatus: "ready",
      })
    }

    // --- Step 3-4: Internal DB enrichment + User DNA ---
    const externalIds = verifiedCandidates.map((v) => v.kakaoPlace.externalId)
    const llmReasonMap = new Map(
      verifiedCandidates
        .filter((v) => v.llmReason)
        .map((v) => [v.kakaoPlace.externalId, v.llmReason as string]),
    )

    console.log(`[Discover] Step 3: Internal DB + DNA loading`)

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
    const candidates: CandidateRaw[] = verifiedCandidates
      .filter((v) => !blacklisted.has(v.kakaoPlace.externalId))
      .map((v) => {
        const k = v.kakaoPlace
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

    // --- Step 5: Scoring ---
    const userTasteDna = tasteDnaResult
    const topTasteAxis = getTopTasteAxis(userTasteDna)
    const frequentAreas = styleDnaResult?.areas.slice(0, 5).map((a) => a.area) ?? []

    console.log(`[Discover] Step 4: Scoring`)
    console.log(`[Discover]   User: records=${recordCount} tasteDna=${userTasteDna ? "real" : "none"} seedGenres=[${seedGenres.join(",")}]`)
    console.log(`[Discover]   Candidates: ${candidates.length} (blacklisted ${blacklisted.size})`)

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

      // Use LLM reason if available, otherwise generate template reason
      const reason = llmReasonMap.get(candidate.kakaoId)
        ?? generateTemplateReason(dominantFactor, {
          scene, area, candidateGenre, topTasteAxis,
          isFrequentArea: frequentAreas.some((fa) =>
            candidate.address.includes(fa) || candidate.roadAddress.includes(fa),
          ),
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

    // --- Scoring log ---
    console.log(`[Discover]   Weights: taste=${top5[0]?.debug.weights.taste} style=${top5[0]?.debug.weights.style} quality=${top5[0]?.debug.weights.quality} novelty=${top5[0]?.debug.weights.novelty}`)
    console.log("[Discover]   #  Score  Taste  Style  Qual  Novel  Genre       Name")
    for (const s of top5) {
      const d = s.debug
      const g = (d.candidateGenre ?? "?").padEnd(10)
      console.log(
        `[Discover]   ${top5.indexOf(s) + 1}  ` +
        `${String(s.scores.overall).padStart(4)}   ` +
        `${String(d.rawScores.taste).padStart(4)}   ` +
        `${String(d.rawScores.style).padStart(4)}   ` +
        `${String(d.rawScores.quality).padStart(4)}   ` +
        `${String(d.rawScores.novelty).padStart(4)}   ` +
        `${g}  ${s.candidate.name}`,
      )
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
      filters: { area, scene, genre, query },
      cacheStatus: "ready",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Discover API] Error:", message)
    return NextResponse.json({ error: `검색 실패: ${message}` }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────
// Step 1: LLM Recommendation
// ─────────────────────────────────────────────────────────

async function getLlmRecommendations(params: {
  area: string | null
  scenes: string[]
  genreLabel: string | null
  query: string | null
}): Promise<LlmRecommendation[]> {
  const { area, scenes, genreLabel, query } = params

  const contextParts: string[] = []
  if (area) contextParts.push(`지역: ${area}`)
  if (scenes.length > 0) contextParts.push(`분위기/상황: ${scenes.join(", ")}`)
  if (genreLabel) contextParts.push(`음식 종류: ${genreLabel}`)
  if (query) contextParts.push(`사용자 요청: "${query}"`)

  const prompt = `당신은 서울/수도권 맛집 전문가입니다. 아래 조건에 맞는 실제 존재하는 맛집을 추천하세요.

## 검색 조건
${contextParts.join("\n")}

## 핵심 규칙 (반드시 지켜야 함)
1. **실존하는 식당만 추천**: 카카오맵에서 검색 가능한 실제 영업 중인 식당만 추천하세요.
2. **확신 없으면 추천하지 마세요**: 이름이나 위치가 불확실하면 해당 식당은 제외하세요.
3. **searchKeyword는 카카오맵 검색용**: "지역명 + 식당이름" 형태로 작성하세요 (예: "강남 스시코지").
4. **다양한 가격대와 스타일**: 고급 식당부터 로컬 맛집까지 다양하게 추천하세요.
5. **8~10개 추천**: 카카오맵 검증 과정에서 탈락할 수 있으니 넉넉히 추천하세요.

## 응답 형식 (JSON만 출력)
{
  "recommendations": [
    {
      "name": "식당 정확한 이름",
      "searchKeyword": "카카오맵 검색 키워드 (지역+이름)",
      "area": "구체적 동네/역명",
      "genre": "한식/일식/양식/중식/카페 등",
      "reason": "이 식당을 추천하는 이유 (1문장, 구체적으로)",
      "confidence": "high 또는 medium"
    }
  ]
}`

  try {
    const result = await callGemini([{ text: prompt }], 0.3) as {
      recommendations?: LlmRecommendation[]
    }

    if (!result.recommendations || !Array.isArray(result.recommendations)) {
      console.warn("[Discover] LLM returned invalid format, using fallback")
      return []
    }

    // Validate and filter
    return result.recommendations
      .filter((r) =>
        typeof r.name === "string" && r.name.length > 0 &&
        typeof r.searchKeyword === "string" && r.searchKeyword.length > 0,
      )
      .slice(0, 10)
  } catch (err) {
    console.error("[Discover] LLM recommendation failed:", err)
    return []
  }
}

// ─────────────────────────────────────────────────────────
// Step 2: Kakao Verification
// ─────────────────────────────────────────────────────────

interface VerifiedCandidate {
  kakaoPlace: {
    externalId: string
    name: string
    address: string
    addressName: string
    categoryName: string
    phone: string
    latitude: number
    longitude: number
    placeUrl: string
    distance: number
  }
  llmReason: string | null
}

async function verifyWithKakao(
  recommendations: LlmRecommendation[],
): Promise<VerifiedCandidate[]> {
  if (recommendations.length === 0) return []

  // Search all in parallel
  const searchResults = await Promise.all(
    recommendations.map(async (rec) => {
      try {
        const results = await searchRestaurantsByKeyword(rec.searchKeyword)
        return { rec, results }
      } catch {
        return { rec, results: [] }
      }
    }),
  )

  const verified: VerifiedCandidate[] = []
  const seenIds = new Set<string>()

  for (const { rec, results } of searchResults) {
    if (results.length === 0) continue

    // Find best name match
    const match = results.find((r) => isNameMatch(r.name, rec.name))
      ?? results[0] // fallback to top result if keyword was specific enough

    if (match && !seenIds.has(match.externalId)) {
      seenIds.add(match.externalId)
      verified.push({
        kakaoPlace: match,
        llmReason: rec.reason,
      })
    }
  }

  return verified
}

/** Fuzzy name match: check if names share the core part */
function isNameMatch(kakaoName: string, llmName: string): boolean {
  const normalize = (s: string) =>
    s.replace(/\s+/g, "")
      .replace(/[^가-힣a-zA-Z0-9]/g, "")
      .toLowerCase()

  const a = normalize(kakaoName)
  const b = normalize(llmName)

  // Exact match after normalization
  if (a === b) return true
  // One contains the other
  if (a.includes(b) || b.includes(a)) return true
  // Share at least 3-char substring
  const shorter = a.length < b.length ? a : b
  const longer = a.length < b.length ? b : a
  if (shorter.length >= 3) {
    for (let i = 0; i <= shorter.length - 3; i++) {
      if (longer.includes(shorter.slice(i, i + 3))) return true
    }
  }
  return false
}

// ─────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────

function generateTemplateReason(
  dominantFactor: "taste" | "style" | "quality" | "novelty",
  context: {
    scene: string | null
    area: string | null
    candidateGenre: string | null
    topTasteAxis: string | null
    isFrequentArea: boolean
  },
): string {
  const TASTE_LABELS: Record<string, string> = {
    spicy: "매운맛", sweet: "단맛", salty: "짭짤한 맛",
    sour: "새콤한 맛", umami: "감칠맛", rich: "풍미",
  }

  switch (dominantFactor) {
    case "taste": {
      const axisLabel = context.topTasteAxis ? TASTE_LABELS[context.topTasteAxis] : null
      if (axisLabel) return `${axisLabel} 좋아하시잖아요. 여기 딱이에요`
      return "취향에 잘 맞는 곳이에요"
    }
    case "style": {
      if (context.isFrequentArea && context.area) {
        return `${context.area} 자주 가시는데, 아직 안 가본 곳이에요`
      }
      if (context.scene) return `${context.scene} 갈 때 딱인 곳이에요`
      return "패턴에 잘 맞는 곳이에요"
    }
    case "quality": return "평판이 좋은 곳이에요"
    case "novelty": {
      const genreLabel = context.candidateGenre ?? "새로운 맛"
      return `새로운 ${genreLabel}도 한번 시도해보세요`
    }
  }
}

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
    .maybeSingle()
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
