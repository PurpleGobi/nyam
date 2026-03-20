import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { searchRestaurantsByKeyword, searchNearbyRestaurants, searchNearbyGrid } from "@/infrastructure/api/kakao-local"
import type { NearbyPlace } from "@/infrastructure/api/kakao-local"
import { searchGooglePlaces } from "@/infrastructure/api/google-places"
import { searchNaverLocal, searchNaverBlogReview } from "@/infrastructure/api/naver-local"
import { callGemini } from "@/infrastructure/api/gemini"
import { SupabaseDiscoverRepository } from "@/infrastructure/repositories/supabase-discover-repository"
import {
  calculateFinalScore,
  getTopTasteAxis,
  inferGenreFromCategory,
} from "@/domain/services/discover-scoring"
import type { CandidateRaw, DiscoverResult, TasteProfileAxis, ReputationBadge, PlatformLink, ReviewSnippet } from "@/domain/entities/discover"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"

// ─────────────────────────────────────────────────────────
// Pipeline G: 크로스플랫폼 검색 → 체인 필터 → 사전 랭킹 → LLM 평가
// 검색 = 메뉴/장르 중심 맛집 발굴, 평가 = LLM이 씬 적합성 판단
// 환각 0%: LLM이 식당을 "생성"하지 않고 실제 검색 결과만 "평가"
// ─────────────────────────────────────────────────────────

/** LLM evaluation result for a single restaurant */
interface LlmEvaluation {
  name: string
  scores: {
    context_fit: number
    reputation: number
    accessibility: number
    authority: number
    trend: number
    review_trust: number
  }
  totalScore: number
  reason: string
  strengths: string[]
  weaknesses: string[]
  confidence: "high" | "medium" | "low"
  category: "safe" | "adventure" | "uncertain"
}

/** 식당의 외부 평판 시그널 (LLM 수집) */
interface ReputationSignal {
  michelin: string | null       // "1star", "2star", "3star", "bib"
  blue_ribbon: number | null    // 0, 1, 2, 3
  tv_shows: string[] | null     // ["수요미식회", "줄서는식당"]
  catch_table: boolean | null
  waiting_level: string | null  // "none", "short", "long", "extreme"
  estimated_years: number | null
  is_specialty: boolean | null
  sns_buzz: string | null       // "high", "medium", "low"
  owner_philosophy: boolean | null
  price_range: string | null    // "~1만", "1~2만", "2~3만", "3~5만", "5만+"
  notable: string | null
}

/**
 * GET /api/discover?area=성수&scene=데이트&genre=japanese&query=조용한 오마카세
 *
 * Pipeline F:
 * 1. 템플릿 키워드 생성 + 카카오/네이버 검색 + 그리드 카테고리 검색
 * 2. 중복 제거 + 체인 필터 + 사전 랭킹
 * 3. LLM 평가 (실제 후보만 평가, 환각 0%)
 * 4. 내부 DB + 사용자 DNA 매칭 보너스
 * 5. 결과 패키징
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

  // Nearby mode: lat/lng coordinates for proximity-based search
  const latParam = searchParams.get("lat")
  const lngParam = searchParams.get("lng")
  const nearbyLat = latParam ? Number(latParam) : null
  const nearbyLng = lngParam ? Number(lngParam) : null
  const nearbyRadius = Number(searchParams.get("radius")) || 1000
  const isNearbyMode = nearbyLat != null && nearbyLng != null && !isNaN(nearbyLat) && !isNaN(nearbyLng)

  if (!area && scenes.length === 0 && !query && !isNearbyMode) {
    return NextResponse.json(
      { error: "area, scene, query, 또는 lat/lng 중 최소 1개가 필요합니다" },
      { status: 400 },
    )
  }

  try {
    const repo = new SupabaseDiscoverRepository(supabase)
    const pipelineSteps: { step: string; detail: string; durationMs: number }[] = []
    const pipelineStart = Date.now()

    const genreLabel = genre
      ? FOOD_CATEGORIES.find((c) => c.value === genre)?.label ?? genre
      : null

    console.log("\n[Discover] ═══════════════════════════════════════")
    console.log(`[Discover] Pipeline G: 크로스플랫폼 검색 → 체인 필터 → LLM 평가`)
    console.log(`[Discover]   area=${area} scenes=[${scenes.join(",")}] genre=${genre} query="${query ?? ""}" nearby=${isNearbyMode}`)

    // ═══ Step 1: 템플릿 키워드 생성 + 검색 ═══
    let t0 = Date.now()

    const searchQueries = generateSearchQueries(area, scene, genreLabel, query)
    const searchLat = nearbyLat ?? getAreaCoordinates(area)?.lat
    const searchLng = nearbyLng ?? getAreaCoordinates(area)?.lng

    // [A] 카카오 키워드 검색 (주력)
    const keywordTasks = searchQueries.map((q) =>
      searchRestaurantsByKeyword(q, searchLat, searchLng),
    )

    // [B] 그리드 카테고리 검색 (교차 검증용)
    const gridTask = searchLat != null && searchLng != null
      ? searchNearbyGrid(searchLat, searchLng, { radius: 500, gridStep: 0.004, gridSize: 1 })
      : Promise.resolve([])

    // [C] 구글 Places 검색 (별점/리뷰 수집)
    // area=null(내주변 모드): 키워드 없이 "식당"으로 근처 검색
    const googleQueries = searchQueries.length > 0
      ? searchQueries.slice(0, 3)
      : (searchLat != null && searchLng != null ? ["식당", "맛집"] : [])
    const googleTasks = googleQueries.map((q) =>
      searchGooglePlaces(q, searchLat, searchLng, 2000),
    )

    // [D] 네이버 지역 검색 (크로스플랫폼 교차 검증)
    const naverQuery = searchQueries[0] ?? (area ? `${area} 맛집` : null)
    const naverTask = naverQuery
      ? searchNaverLocal(naverQuery, 5).catch(() => [] as NearbyPlace[])
      : Promise.resolve([] as NearbyPlace[])

    const [keywordResultsSettled, gridResults, naverResults, ...googleResultsSettled] = await Promise.all([
      Promise.allSettled(keywordTasks),
      gridTask,
      naverTask,
      ...googleTasks.map((t) => t.catch(() => [] as NearbyPlace[])),
    ])

    const keywordResults: NearbyPlace[] = []
    for (const result of keywordResultsSettled) {
      if (result.status === "fulfilled") {
        keywordResults.push(...result.value)
      }
    }

    const googleResults: NearbyPlace[] = []
    for (const result of googleResultsSettled) {
      if (Array.isArray(result)) {
        googleResults.push(...result)
      }
    }

    const keywordNames = new Set(keywordResults.map((r) => r.name))
    const allSearchResults = [...keywordResults, ...googleResults, ...gridResults, ...naverResults]

    const step1Ms = Date.now() - t0
    pipelineSteps.push({
      step: "크로스플랫폼 검색",
      detail: `카카오 ${keywordResults.length} + 구글 ${googleResults.length} + 그리드 ${gridResults.length} + 네이버 ${naverResults.length}건 (쿼리: ${searchQueries.slice(0, 3).join(", ")}...)`,
      durationMs: step1Ms,
    })
    console.log(`[Discover] Step 1: 검색 완료 (${step1Ms}ms) - 카카오 ${keywordResults.length} + 구글 ${googleResults.length} + 그리드 ${gridResults.length} + 네이버 ${naverResults.length}`)

    // ═══ Step 2: 중복 제거 + 체인 필터 + 사전 랭킹 ═══
    t0 = Date.now()

    // Dedup by externalId
    const deduped = deduplicatePlaces(allSearchResults)
    const beforeFilter = deduped.length

    // Chain filter
    const filtered = deduped.filter((r) => !isChain(r.name))
    const chainRemoved = beforeFilter - filtered.length

    // Pre-rank: quality signals > scene keywords
    const CANDIDATE_CAP = 20
    const ranked = filtered
      .map((place) => ({
        place,
        preScore: preRankScore(place, scene, keywordNames),
      }))
      .sort((a, b) => b.preScore - a.preScore)
      .slice(0, CANDIDATE_CAP)

    const step2Ms = Date.now() - t0
    pipelineSteps.push({
      step: "중복 제거 + 체인 필터 + 사전 랭킹",
      detail: `${allSearchResults.length} → ${deduped.length} (dedup) → ${filtered.length} (체인 ${chainRemoved}개 제거) → 상위 ${ranked.length}개`,
      durationMs: step2Ms,
    })
    console.log(`[Discover] Step 2: 필터+랭킹 (${step2Ms}ms) - ${filtered.length} → Top ${ranked.length}`)

    // ═══ Step 3: 평판 시그널 수집 + LLM 평가 ═══
    t0 = Date.now()

    const candidatePlaces = ranked.map((r) => r.place)

    // 평판 시그널 수집 (LLM이 미슐랭/블루리본/TV 등 수집)
    const signals = await collectReputationSignals(candidatePlaces, area)
    const signalMs = Date.now() - t0
    const signalCount = [...signals.values()].filter((s) =>
      s.michelin || s.blue_ribbon || s.tv_shows?.length || s.estimated_years || s.is_specialty,
    ).length
    console.log(`[Discover]   시그널 수집: ${signals.size}개 중 유의미 ${signalCount}개 (${signalMs}ms)`)

    pipelineSteps.push({
      step: "평판 시그널 수집",
      detail: `${signals.size}개 식당, 유의미 시그널 ${signalCount}개`,
      durationMs: signalMs,
    })

    // LLM 평가 (시그널 주입)
    const llmT0 = Date.now()
    const { evaluations, prompt: llmPrompt } = await evaluateWithLlm(
      candidatePlaces, scene, area, query, genreLabel, signals,
    )

    // Map LLM evaluations to places by name
    const evalMap = new Map<string, LlmEvaluation>()
    for (const ev of evaluations) {
      evalMap.set(ev.name, ev)
      // Also try fuzzy match for slight name differences
      for (const place of candidatePlaces) {
        if (isNameMatch(place.name, ev.name)) {
          evalMap.set(place.name, ev)
        }
      }
    }

    // Nearby supplement: merge in Kakao nearby results when coordinates provided
    if (isNearbyMode && nearbyLat != null && nearbyLng != null) {
      const existingIds = new Set(candidatePlaces.map((p) => p.externalId))
      const nearbyResults = await searchNearbyRestaurants(nearbyLat, nearbyLng, Math.min(nearbyRadius, 2000))
      let added = 0
      for (const r of nearbyResults) {
        if (!existingIds.has(r.externalId) && !isChain(r.name)) {
          candidatePlaces.push(r)
          existingIds.add(r.externalId)
          added++
        }
      }
      if (added > 0) {
        console.log(`[Discover]   Nearby supplement: ${added} added`)
        pipelineSteps.push({
          step: "주변 식당 보충",
          detail: `${nearbyRadius}m 반경 ${nearbyResults.length}개 중 ${added}개 추가`,
          durationMs: 0,
        })
      }
    }

    const llmMs = Date.now() - llmT0
    const step3Ms = Date.now() - t0
    pipelineSteps.push({
      step: "LLM 평가 (시그널 통합, 환각 0%)",
      detail: `${evaluations.length}개 평가 완료 (LLM ${llmMs}ms)`,
      durationMs: step3Ms,
    })
    console.log(`[Discover] Step 3: 시그널+LLM 평가 (${step3Ms}ms, LLM ${llmMs}ms) - ${evaluations.length}개`)
    for (const ev of evaluations.slice(0, 5)) {
      console.log(`[Discover]   ${ev.name}: ${ev.totalScore}점 (${ev.confidence}, ${ev.category})`)
    }

    if (candidatePlaces.length === 0) {
      return NextResponse.json({
        success: true,
        source: "realtime",
        computedAt: new Date().toISOString(),
        results: [],
        filters: { area, scene, genre, query },
        cacheStatus: "ready",
      })
    }

    // ═══ Step 4: 내부 DB + 사용자 DNA ═══
    const externalIds = candidatePlaces.map((p) => p.externalId)

    console.log(`[Discover] Step 4: 내부 DB + DNA 로딩`)

    t0 = Date.now()
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
    const step4Ms = Date.now() - t0

    pipelineSteps.push({
      step: "내부 DB + DNA 로딩",
      detail: `records=${recordCount} tasteDna=${tasteDnaResult ? "real" : "none"} internalMatch=${internalCandidates.length} blacklisted=${blacklisted.size}`,
      durationMs: step4Ms,
    })

    const internalMap = new Map(internalCandidates.map((c) => [c.externalId, c]))

    // Merge into CandidateRaw[]
    const candidates: CandidateRaw[] = candidatePlaces
      .filter((p) => !blacklisted.has(p.externalId))
      .map((p) => {
        const internal = internalMap.get(p.externalId)
        return {
          kakaoId: p.externalId,
          name: p.name,
          address: p.addressName,
          roadAddress: p.address,
          lat: p.latitude,
          lng: p.longitude,
          phone: p.phone || null,
          kakaoUrl: p.placeUrl,
          category: p.categoryName,
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

    // NearbyPlace 데이터 보존 (구글 사진/링크/별점 → Step 6에서 사용)
    const placeMap = new Map(candidatePlaces.map((p) => [p.externalId, p]))

    // ═══ Step 5: LLM 평가 + DNA 매칭 보너스 스코어링 ═══
    const userTasteDna = tasteDnaResult
    const topTasteAxis = getTopTasteAxis(userTasteDna)
    const frequentAreas = styleDnaResult?.areas.slice(0, 5).map((a) => a.area) ?? []

    console.log(`[Discover] Step 5: LLM 평가 + DNA 매칭 보너스`)
    console.log(`[Discover]   User: records=${recordCount} tasteDna=${userTasteDna ? "real" : "none"} seedGenres=[${seedGenres.join(",")}]`)

    const DNA_BONUS_MAX = 15

    t0 = Date.now()

    const scored = candidates.map((candidate) => {
      const candidateGenre = inferGenreFromCategory(candidate.category)
        ?? internalMap.get(candidate.kakaoId)?.genre
        ?? genre
        ?? null
      const isNew = !visitedSet.has(candidate.kakaoId)

      // LLM evaluation score (0-100) — from real search results, not hallucinated
      const llmEval = evalMap.get(candidate.name)
      const llmScore = llmEval?.totalScore ?? estimateFallbackScore(candidate, { query, area, scene, genreLabel })

      // DNA match calculation
      const { scores: dnaScores, dominantFactor, debug } = calculateFinalScore({
        candidate,
        userTasteDna,
        userStyleDna: styleDnaResult,
        userRecordCount: recordCount,
        scene,
        candidateGenre,
        isNewForUser: isNew,
        seedGenres,
      })

      // DNA bonus
      const dnaMatchRatio = dnaScores.overall > 0
        ? (dnaScores.overall - 50) / 50
        : 0
      const dnaBonus = Math.round(dnaMatchRatio * DNA_BONUS_MAX)

      const finalScore = Math.max(0, Math.min(100, llmScore + dnaBonus))

      const scores = {
        ...dnaScores,
        overall: finalScore,
      }

      const reason = llmEval?.reason
        ?? generateFallbackReason(candidate, { query, scene, area, candidateGenre })
        ?? generateTemplateReason(dominantFactor, {
          scene, area, candidateGenre, topTasteAxis,
          isFrequentArea: frequentAreas.some((fa) =>
            candidate.address.includes(fa) || candidate.roadAddress.includes(fa),
          ),
        })

      return {
        candidate, scores, reason, candidateGenre, isNew, dominantFactor, debug,
        llmScore, dnaBonus,
        llmCategory: llmEval?.category ?? null,
        llmStrengths: llmEval?.strengths ?? [],
        llmWeaknesses: llmEval?.weaknesses ?? [],
      }
    })

    // Sort by blended overall score descending
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

    const step5Ms = Date.now() - t0

    // --- Scoring log ---
    console.log("[Discover]   #  Final  LLM  DNA(overall)  Bonus  Cat        Name")
    for (const s of top5) {
      const cat = (s.llmCategory ?? "fallback").padEnd(9)
      const bonus = s.dnaBonus >= 0 ? `+${s.dnaBonus}` : `${s.dnaBonus}`
      console.log(
        `[Discover]   ${top5.indexOf(s) + 1}  ` +
        `${String(s.scores.overall).padStart(5)}   ` +
        `${String(s.llmScore).padStart(3)}  ` +
        `${String(s.debug.rawScores.taste).padStart(7)}       ` +
        `${bonus.padStart(4)}   ` +
        `${cat}  ${s.candidate.name}`,
      )
    }
    const totalMs = Date.now() - pipelineStart
    console.log(`[Discover]   Total: ${totalMs}ms`)
    console.log("[Discover] ═══════════════════════════════════════\n")

    const scoredDebugResults = top5.map((s, i) => ({
      rank: i + 1,
      name: s.candidate.name,
      blended: s.scores.overall,
      llmScore: s.llmScore,
      dnaScore: s.debug.rawScores.taste,
      category: s.llmCategory ?? "fallback",
      reason: s.reason,
    }))

    pipelineSteps.push({
      step: "LLM 평가 + DNA 매칭 보너스",
      detail: `LLM base + DNA match bonus (±${DNA_BONUS_MAX}점) | ${candidates.length}개 후보 → Top 5 선별`,
      durationMs: step5Ms,
    })

    // ═══ Step 6: 결과 패키징 (사진/배지/플랫폼링크/리뷰 스니펫 포함) ═══
    t0 = Date.now()

    // 블로그 리뷰 스니펫 병렬 수집 (Top 5만)
    const blogSnippets = await Promise.all(
      top5.map((s) =>
        searchNaverBlogReview(s.candidate.name, area).catch(() => null),
      ),
    )

    const results: DiscoverResult[] = top5.map((s, i) => {
      const place = placeMap.get(s.candidate.kakaoId)
      const sig = findSignal(s.candidate.name, signals)

      // 사진: 구글 Places에서 수집한 사진 URL
      const photos = place?.photoUrls ?? []

      // 플랫폼 링크: 카카오 + 구글 + 네이버 (별점 포함)
      const platformLinks: PlatformLink[] = [
        { platform: "kakao", url: s.candidate.kakaoUrl, rating: null, reviewCount: null },
      ]
      if (place?.googleMapsUrl) {
        platformLinks.push({
          platform: "google",
          url: place.googleMapsUrl,
          rating: place.googleRating ?? null,
          reviewCount: place.googleReviewCount ?? null,
        })
      }
      // 네이버 지도 링크 (이름으로 검색 URL 생성)
      const naverMapUrl = `https://map.naver.com/p/search/${encodeURIComponent(s.candidate.name)}`
      platformLinks.push({
        platform: "naver",
        url: naverMapUrl,
        rating: null,
        reviewCount: null,
      })

      // 명성 배지: signals에서 변환
      const badges: ReputationBadge[] = buildBadges(sig)

      // 리뷰 스니펫: 네이버 블로그 검색 결과
      const reviewSnippet: ReviewSnippet | null = blogSnippets[i] ?? null

      // 실용 정보: signals에서 추출
      const priceRange = sig?.price_range
        ? mapPriceRange(sig.price_range)
        : null
      const waiting = sig?.waiting_level && sig.waiting_level !== "none"
        ? sig.waiting_level
        : null

      return {
        rank: i + 1,
        restaurant: {
          name: s.candidate.name,
          address: s.candidate.roadAddress || s.candidate.address,
          genre: s.candidateGenre ?? "other",
          kakaoId: s.candidate.kakaoId,
          kakaoUrl: s.candidate.kakaoUrl,
          photo: photos[0] ?? s.candidate.imageUrl,
          phone: s.candidate.phone,
          hours: s.candidate.hours,
        },
        practicalInfo: {
          parking: null,
          reservation: sig?.catch_table ?? null,
          waiting,
          priceRange,
          popularMenus: [],
        },
        scores: s.scores,
        reason: s.reason,
        highlights: [
          ...buildHighlights(s.candidate),
          ...(s.llmCategory === "safe" ? ["안전픽"] : []),
          ...(s.llmCategory === "adventure" ? ["모험픽"] : []),
          ...(s.llmStrengths.length > 0 ? [s.llmStrengths[0]] : []),
        ].slice(0, 4),
        internalRecordCount: s.candidate.internalRecordCount,
        hasVisited: visitedSet.has(s.candidate.kakaoId),
        sourceCount: place?.sources.length ?? 1,
        ...(isNearbyMode && nearbyLat != null && nearbyLng != null ? {
          distance: Math.round(haversineDistance(nearbyLat, nearbyLng, s.candidate.lat, s.candidate.lng)),
        } : {}),
        photos,
        platformLinks,
        badges,
        reviewSnippet,
      }
    })

    const step6Ms = Date.now() - t0
    pipelineSteps.push({
      step: "결과 패키징 (사진/배지/리뷰)",
      detail: `사진 ${results.filter((r) => r.photos.length > 0).length}건, 배지 ${results.reduce((n, r) => n + r.badges.length, 0)}개, 리뷰 ${results.filter((r) => r.reviewSnippet).length}건`,
      durationMs: step6Ms,
    })

    const response = NextResponse.json({
      success: true,
      source: "realtime",
      computedAt: new Date().toISOString(),
      results,
      filters: { area, scene, genre, query },
      cacheStatus: "ready",
      meta: {
        blendRatio: { llm: 100, dna: DNA_BONUS_MAX },
        llmCandidates: candidatePlaces.length,
        verifiedCandidates: candidatePlaces.length,
        scoreDisclaimer: "점수는 실제 검색 결과의 LLM 평가 기반이며 개인 취향에 따라 보정됩니다.",
      },
      debug: {
        pipeline: pipelineSteps,
        blendRatio: { llm: 100, dna: DNA_BONUS_MAX },
        llmCandidates: candidatePlaces.length,
        verifiedCandidates: candidatePlaces.length,
        scoredResults: scoredDebugResults,
        prompt: llmPrompt,
        inputContext: `area=${area} scene=${scene} genre=${genre} query=${query}`,
      },
    })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Discover API] Error:", message)
    return NextResponse.json({ error: `검색 실패: ${message}` }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────
// Step 1: 템플릿 키워드 생성
// ─────────────────────────────────────────────────────────

/**
 * Pipeline G 키워드: 메뉴/장르 중심 (씬 키워드 제거)
 * 씬은 검색에 쓸모없음 → LLM 평가에서 판단
 */
const MENU_KEYWORDS: Record<string, string[]> = {
  "일식": ["{area} 라멘", "{area} 돈까스", "{area} 우동", "{area} 스시", "{area} 소바", "{area} 오마카세", "{area} 카츠"],
  "한식": ["{area} 국밥", "{area} 백반", "{area} 찌개", "{area} 칼국수", "{area} 국수", "{area} 한정식", "{area} 냉면"],
  "중식": ["{area} 짜장면", "{area} 마라탕", "{area} 딤섬", "{area} 양꼬치", "{area} 중식당"],
  "양식": ["{area} 파스타", "{area} 스테이크", "{area} 피자", "{area} 브런치", "{area} 레스토랑"],
  "고기/구이": ["{area} 삼겹살", "{area} 갈비", "{area} 소고기", "{area} 고기 구이"],
  "아시안": ["{area} 쌀국수", "{area} 카레", "{area} 태국", "{area} 베트남"],
  "술집": ["{area} 이자카야", "{area} 호프", "{area} 포차", "{area} 와인바"],
}

const SCENE_TO_GENRES: Record<string, string[]> = {
  "혼밥": ["일식", "한식", "아시안"],
  "데이트": ["양식", "일식"],
  "비즈니스": ["한식", "일식", "양식"],
  "친구모임": ["고기/구이", "한식"],
  "가족": ["한식", "중식"],
  "술자리": ["술집", "일식"],
}

function generateSearchQueries(
  area: string | null,
  scene: string | null,
  genreLabel: string | null,
  query: string | null,
): string[] {
  // area=null (내주변 모드): 키워드 검색 무의미 → 빈 배열 반환
  // 그리드 카테고리 검색 + 구글 근처 검색에만 의존
  if (!area) {
    if (query) {
      // 사용자가 직접 입력한 검색어는 유지
      return [query, `${query} 전문점`]
    }
    return []
  }

  const queries: string[] = []

  // 1. 사용자 직접 검색어 (최우선)
  if (query) {
    queries.push(`${area} ${query}`)
    queries.push(`${area} ${query} 전문점`)
  }

  // 2. 장르가 지정된 경우: 해당 장르 메뉴 키워드
  if (genreLabel) {
    const templates = MENU_KEYWORDS[genreLabel] ?? [`{area} ${genreLabel}`]
    for (const tmpl of templates) {
      queries.push(tmpl.replace("{area}", area))
    }
  } else {
    // 3. 장르 미지정: 씬에 맞는 장르들의 메뉴 키워드
    const relatedGenres = SCENE_TO_GENRES[scene ?? ""] ?? ["한식", "일식"]
    for (const g of relatedGenres) {
      const templates = MENU_KEYWORDS[g] ?? []
      for (const tmpl of templates.slice(0, 4)) {
        queries.push(tmpl.replace("{area}", area))
      }
    }
  }

  // 4. 발굴 키워드
  queries.push(`${area} 노포`)
  queries.push(`${area} 현지인 식당`)

  // 5. 최후 폴백
  queries.push(`${area} 맛집`)

  return [...new Set(queries)]
}

// ─────────────────────────────────────────────────────────
// Step 2: 체인 필터 + 사전 랭킹
// ─────────────────────────────────────────────────────────

const CHAIN_BLACKLIST = new Set([
  "맥도날드", "버거킹", "롯데리아", "kfc", "파파이스", "맘스터치",
  "노브랜드버거", "쉐이크쉑", "모스버거",
  "스타벅스", "투썸플레이스", "이디야", "빽다방", "메가커피",
  "컴포즈커피", "할리스", "탐앤탐스", "커피빈", "폴바셋",
  "편의점", "cu", "gs25", "세븐일레븐", "이마트24",
  "파리바게뜨", "뚜레쥬르", "던킨", "크리스피크림",
  "김밥천국", "김가네", "바르다김선생",
])

function isChain(name: string): boolean {
  const normalized = name.replace(/\s+/g, "").toLowerCase()
  for (const chain of CHAIN_BLACKLIST) {
    if (normalized.includes(chain)) return true
  }
  return false
}

function deduplicatePlaces(places: NearbyPlace[]): NearbyPlace[] {
  const seen = new Map<string, NearbyPlace>()
  for (const place of places) {
    const existing = seen.get(place.name.replace(/\s+/g, "").toLowerCase())
    if (existing) {
      // 크로스플랫폼 병합: 출처 합치고, 구글 별점/사진/링크 반영
      if (!existing.sources.includes(place.sources[0])) {
        existing.sources.push(place.sources[0])
      }
      if (place.googleRating != null && existing.googleRating == null) {
        existing.googleRating = place.googleRating
        existing.googleReviewCount = place.googleReviewCount
      }
      if (place.googleMapsUrl && !existing.googleMapsUrl) {
        existing.googleMapsUrl = place.googleMapsUrl
      }
      if (place.photoUrls?.length && !existing.photoUrls?.length) {
        existing.photoUrls = place.photoUrls
      }
    } else {
      seen.set(place.name.replace(/\s+/g, "").toLowerCase(), { ...place })
    }
  }
  return [...seen.values()]
}

/** Pipeline G 사전 랭킹: 키워드 히트 + 크로스플랫폼 + 구글 별점 + 거리 + 장르 */
function preRankScore(
  place: NearbyPlace,
  scene: string | null,
  keywordNames: Set<string>,
): number {
  let score = 0

  // 1. 키워드 검색 히트 (30점) — 검색에 잡힘 = 관련성 확보
  if (keywordNames.has(place.name)) score += 30

  // 2. 크로스플랫폼 출현 (20점)
  if (place.sources.length >= 3) score += 20
  else if (place.sources.length >= 2) score += 12

  // 3. 구글 별점 × 리뷰 수 (20점)
  if (place.googleRating != null && place.googleReviewCount != null) {
    if (place.googleReviewCount >= 100 && place.googleRating >= 4.0) score += 20
    else if (place.googleReviewCount >= 30 && place.googleRating >= 3.8) score += 12
    else if (place.googleReviewCount >= 10) score += 5
  } else if (place.googleRating != null && place.googleRating >= 4.0) {
    score += 8
  }

  // 4. 거리 (15점)
  if (place.distance > 0) {
    score += Math.max(0, 15 - place.distance / 150)
  }

  // 5. 장르 매칭 (15점)
  const text = `${place.categoryName} ${place.name}`.toLowerCase()
  const genreKeywords: Record<string, string[]> = {
    "혼밥": ["국수", "라멘", "우동", "돈까스", "카레", "덮밥", "소바", "카츠", "백반", "국밥"],
    "데이트": ["이탈리", "프렌치", "파스타", "와인", "레스토랑", "비스트로", "다이닝", "오마카세"],
    "비즈니스": ["한정식", "오마카세", "프렌치", "코스", "스시", "스테이크"],
    "친구모임": ["고기", "구이", "삼겹", "치킨", "닭갈비", "갈비"],
    "가족": ["한식", "중식", "뷔페", "갈비", "한정식", "국밥"],
    "술자리": ["호프", "포차", "이자카야", "바", "술집"],
  }
  for (const kw of genreKeywords[scene ?? ""] ?? []) {
    if (text.includes(kw)) {
      score += 15
      break
    }
  }

  return score
}

// ─────────────────────────────────────────────────────────
// Step 3: LLM 평가 (실제 후보만 평가)
// ─────────────────────────────────────────────────────────

/** 씬별 가중치 */
const SCENE_WEIGHTS: Record<string, Record<string, number>> = {
  "혼밥": { context_fit: 35, reputation: 25, accessibility: 20, authority: 5, trend: 10, review_trust: 5 },
  "데이트": { context_fit: 35, reputation: 20, accessibility: 10, authority: 20, trend: 10, review_trust: 5 },
  "비즈니스": { context_fit: 35, reputation: 20, accessibility: 25, authority: 10, trend: 5, review_trust: 5 },
  "친구모임": { context_fit: 30, reputation: 25, accessibility: 15, authority: 10, trend: 15, review_trust: 5 },
  "가족": { context_fit: 35, reputation: 25, accessibility: 15, authority: 15, trend: 5, review_trust: 5 },
  "술자리": { context_fit: 30, reputation: 20, accessibility: 20, authority: 10, trend: 15, review_trust: 5 },
}
const DEFAULT_WEIGHTS: Record<string, number> = {
  context_fit: 30, reputation: 20, accessibility: 15, authority: 15, trend: 10, review_trust: 10,
}

function getSceneDescription(scene: string | null): string {
  const descriptions: Record<string, string> = {
    "혼밥": "1인석/바석, 빠른 회전, 대기 스트레스 낮음, 혼자 편한 분위기",
    "데이트": "분위기, 소음도, 2인 테이블, 동선, 예약 안정성",
    "비즈니스": "단체석/룸, 예약 편의성, 격식, 접대에 적합",
    "친구모임": "4-6인 단체석, 활기찬 분위기, 다양한 메뉴, 가성비",
    "가족": "주차, 아이 동반, 메뉴 폭, 편안한 좌석",
    "술자리": "늦은 영업, 안주력, 2차 연계, 대화 가능",
  }
  return descriptions[scene ?? ""] ?? "일반적인 식사 적합성"
}

/** 씬별 감점 규칙 */
function getSceneNegativeRules(scene: string | null): string {
  const rules: Record<string, string> = {
    "혼밥": `- 프랜차이즈 체인은 context_fit 최대 30점
- 고급 이자카야/바는 혼밥에 어색할 수 있으므로 context_fit 감점
- 단체 전용 식당은 context_fit 20점 이하`,
    "데이트": `- 프랜차이즈/패스트푸드는 context_fit 최대 20점
- 시끌벅적한 호프집/주점은 데이트에 부적합
- 1인 전문점은 데이트에 부적합`,
    "비즈니스": `- 프랜차이즈/패스트푸드는 context_fit 최대 10점
- 분식집/포장마차는 context_fit 20점 이하
- 고급 한식, 일식 오마카세, 프렌치/이탈리안이 적합`,
    "친구모임": `- 1인 전문점은 context_fit 20점 이하
- 4인 이상 단체석이 있는 곳 우대
- 인당 5만원 이상은 감점`,
    "가족": `- 술집/바/이자카야는 가족에 부적합
- 주차 가능 여부 중요
- 아이 메뉴가 있거나 소음에 관대한 곳 우대`,
    "술자리": `- 주류를 팔지 않는 곳은 context_fit 최대 20점
- 안주가 다양한 곳 우대`,
  }
  return rules[scene ?? ""] ?? "- 특별한 부정 규칙 없음"
}

/** LLM(Gemini)으로 식당들의 외부 평판 시그널 수집 */
async function collectReputationSignals(
  places: NearbyPlace[],
  area: string | null,
): Promise<Map<string, ReputationSignal>> {
  if (places.length === 0) return new Map()

  const names = places.slice(0, 25).map((p) => p.name)
  const namesText = names.map((n) => `- ${n}`).join("\n")

  const prompt = `아래 식당들에 대해 알고 있는 평판 정보를 정리해라.
모르는 항목은 반드시 null로. 추측하지 말 것. 확실한 정보만.

지역: ${area ?? "서울"}

식당 목록:
${namesText}

JSON 형식으로 응답:
{
  "signals": {
    "식당이름": {
      "michelin": null,
      "blue_ribbon": null,
      "tv_shows": null,
      "catch_table": null,
      "waiting_level": null,
      "estimated_years": null,
      "is_specialty": null,
      "sns_buzz": null,
      "owner_philosophy": null,
      "price_range": null,
      "notable": null
    }
  }
}

필드 설명:
- michelin: "3star"|"2star"|"1star"|"bib" 또는 null
- blue_ribbon: 블루리본 서베이 리본 수 (0~3) 또는 null
- tv_shows: 출연 TV 프로그램 이름 목록 또는 null (예: ["수요미식회", "줄서는식당"])
- catch_table: 캐치테이블/예약 앱에 등록되어 있는지 (true/false/null)
- waiting_level: 평소 대기 수준 "none"|"short"|"long"|"extreme" 또는 null
- estimated_years: 추정 영업 기간 (년 단위, 정수) 또는 null
- is_specialty: 전문점 여부 (메인 메뉴 3개 이하) true/false 또는 null
- sns_buzz: SNS(인스타/유튜브) 화제성 "high"|"medium"|"low" 또는 null
- owner_philosophy: 사장님 철학/스토리가 알려진 곳인지 true/false 또는 null
- price_range: "~1만"|"1~2만"|"2~3만"|"3~5만"|"5만+" 또는 null
- notable: 기타 특이사항 한 줄 메모 또는 null`

  try {
    const result = await callGemini([{ text: prompt }], 0.1) as {
      signals?: Record<string, Partial<ReputationSignal>>
    }

    const signalMap = new Map<string, ReputationSignal>()
    const raw = result.signals ?? {}
    for (const [name, sig] of Object.entries(raw)) {
      signalMap.set(name, {
        michelin: sig.michelin ?? null,
        blue_ribbon: sig.blue_ribbon ?? null,
        tv_shows: sig.tv_shows ?? null,
        catch_table: sig.catch_table ?? null,
        waiting_level: sig.waiting_level ?? null,
        estimated_years: sig.estimated_years ?? null,
        is_specialty: sig.is_specialty ?? null,
        sns_buzz: sig.sns_buzz ?? null,
        owner_philosophy: sig.owner_philosophy ?? null,
        price_range: sig.price_range ?? null,
        notable: sig.notable ?? null,
      })
    }
    return signalMap
  } catch (err) {
    console.error("[Discover] 시그널 수집 실패:", err instanceof Error ? err.message : err)
    return new Map()
  }
}

/** 이름 퍼지 매칭으로 시그널 찾기 */
function findSignal(name: string, signals: Map<string, ReputationSignal>): ReputationSignal | null {
  const normalize = (s: string) =>
    s.replace(/\s+/g, "").replace(/[^가-힣a-zA-Z0-9]/g, "").toLowerCase()

  const nameN = normalize(name)
  for (const [sigName, sig] of signals) {
    const sigN = normalize(sigName)
    if (nameN === sigN || nameN.includes(sigN) || sigN.includes(nameN)) {
      return sig
    }
  }
  return null
}

async function evaluateWithLlm(
  places: NearbyPlace[],
  scene: string | null,
  area: string | null,
  query: string | null,
  genreLabel: string | null,
  signals: Map<string, ReputationSignal>,
): Promise<{ evaluations: LlmEvaluation[]; prompt: string }> {
  if (places.length === 0) return { evaluations: [], prompt: "" }

  const weights = SCENE_WEIGHTS[scene ?? ""] ?? DEFAULT_WEIGHTS

  const restaurantList = places.map((p) => {
    let info = `- ${p.name} | 카테고리: ${p.categoryName}`
    if (p.address) info += ` | 주소: ${p.address}`
    if (p.distance > 0) info += ` | 거리: ${p.distance}m`
    if (p.googleRating != null) {
      info += ` | 구글 ${p.googleRating}★`
      if (p.googleReviewCount != null) info += ` (${p.googleReviewCount}건)`
    }
    if (p.sources.length > 1) info += ` | ${p.sources.length}개 플랫폼(${p.sources.join(",")})`

    // 수집된 평판 시그널 주입
    const sig = findSignal(p.name, signals)
    if (sig) {
      const sigParts: string[] = []
      if (sig.michelin) sigParts.push(`미슐랭 ${sig.michelin}`)
      if (sig.blue_ribbon) sigParts.push(`블루리본 ${sig.blue_ribbon}개`)
      if (sig.tv_shows?.length) sigParts.push(`TV: ${sig.tv_shows.join(", ")}`)
      if (sig.estimated_years && sig.estimated_years >= 5) sigParts.push(`노포 ${sig.estimated_years}년`)
      if (sig.is_specialty) sigParts.push("전문점")
      if (sig.catch_table) sigParts.push("캐치테이블")
      if (sig.waiting_level) sigParts.push(`웨이팅: ${sig.waiting_level}`)
      if (sig.sns_buzz) sigParts.push(`SNS: ${sig.sns_buzz}`)
      if (sig.owner_philosophy) sigParts.push("사장님 철학")
      if (sig.price_range) sigParts.push(`${sig.price_range}원대`)
      if (sig.notable) sigParts.push(sig.notable)
      if (sigParts.length > 0) info += ` | ${sigParts.join(" / ")}`
    }

    return info
  }).join("\n")

  const contextParts: string[] = []
  if (query) contextParts.push(`★ 사용자 요청: "${query}"`)
  if (scene) contextParts.push(`씬: ${scene}`)
  if (area) contextParts.push(`지역: ${area}`)
  if (genreLabel) contextParts.push(`장르: ${genreLabel}`)

  const prompt = `[역할]
당신은 한국 외식 큐레이터다.
아래 실제 검색된 식당들을 씬에 맞게 평가하고 순위를 매겨라.

중요: 아래 식당만 평가하라. 새로운 식당을 추가하지 마라.

★ 2단계 평가를 수행하라:
1단계) 각 식당에 대해 네가 알고 있는 정보를 활용하라:
  - 미슐랭/블루리본 인증 여부
  - TV 프로그램(수요미식회, 줄서는식당, 백종원 등) 출연 여부
  - 캐치테이블/예약 앱 등록 여부
  - 추정 영업 기간 (노포 여부)
  - 전문점 여부 (메인 메뉴 3개 이하)
  - SNS 화제성, 사장님 철학/스토리
2단계) 위 정보 + 제공된 실제 데이터(구글 별점, 리뷰 수, 수집된 시그널 등)를 종합하여 채점하라.

★ 채점 가이드 (각 항목 0-100):
- 구글 별점 4.0+ & 리뷰 100+ → reputation 70점 이상
- 미슐랭/블루리본 인증 → authority 80점 이상
- TV 프로그램 출연 → trend/authority 가점
- 노포 (5년+) → reputation, review_trust 가점
- 전문점 (메뉴 3개 이하) → context_fit 가점 (특히 혼밥)
- 3개 플랫폼 출현 → reputation, review_trust 가점
- 리뷰 적은데 별점 극단적 → review_trust 감점 (조작 의심)
- 항목 간 점수 차이를 두어 순위가 명확히 나오게 하라

────────────────
검색 조건
────────────────
${contextParts.join("\n")}

────────────────
평가 대상 식당 (${places.length}개)
────────────────
${restaurantList}

────────────────
평가 기준과 가중치 (총 100점)
────────────────
- context_fit (${weights.context_fit}점): ${getSceneDescription(scene)}
- reputation (${weights.reputation}점): 대중 평판 (구글 별점, 리뷰 수, 플랫폼 간 일관성)
- accessibility (${weights.accessibility}점): 접근성 (예약, 웨이팅, 방문 난이도)
- authority (${weights.authority}점): 권위 신호 (미슐랭, 블루리본, TV 출연)
- trend (${weights.trend}점): 최근성 (SNS 화제성, 최근 후기)
- review_trust (${weights.review_trust}점): 리뷰 신뢰도 (크로스플랫폼 검증, 광고성 감점)

────────────────
★ 감점 규칙 (필수 적용) ★
────────────────
${getSceneNegativeRules(scene)}

공통 규칙:
- 프랜차이즈 대형 체인은 authority 감점
- 카페, 베이커리, 편의점은 context_fit 감점
- ★ 순위가 명확히 나올 만큼 점수 차를 줘라 (1등과 10등 차이 최소 20점)

────────────────
출력 형식 (JSON만)
────────────────
{
  "evaluations": [
    {
      "name": "식당 이름 (입력과 정확히 동일하게)",
      "scores": {
        "context_fit": 85,
        "reputation": 70,
        "accessibility": 60,
        "authority": 40,
        "trend": 75,
        "review_trust": 65
      },
      "totalScore": 72,
      "reason": "씬 맥락 포함 추천 이유 (1문장)",
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "confidence": "high",
      "category": "safe"
    }
  ]
}

상위 10개만 평가. totalScore 내림차순 정렬.`

  try {
    const result = await callGemini([{ text: prompt }], 0.2) as {
      evaluations?: LlmEvaluation[]
    }

    if (!result || !result.evaluations || result.evaluations.length === 0) {
      console.error("[Discover] LLM 평가 0개 — raw response:", JSON.stringify(result).slice(0, 500))
    }

    const evaluations = (result.evaluations ?? []).map((ev) => {
      // Recalculate total with our weights (don't trust LLM arithmetic)
      const scores = ev.scores ?? {}
      let total = 0
      for (const [key, weight] of Object.entries(weights)) {
        const s = (scores as Record<string, number>)[key] ?? 50
        total += s * weight / 100
      }
      return { ...ev, totalScore: Math.round(total) }
    })

    evaluations.sort((a, b) => b.totalScore - a.totalScore)
    return { evaluations, prompt }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const errStack = err instanceof Error ? err.stack : ""
    console.error(`[Discover] LLM evaluation failed: ${errMsg}`)
    console.error(`[Discover] LLM error detail:`, errStack)
    return { evaluations: [], prompt }
  }
}

// ─────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────

/** 주요 지역명 → 좌표 매핑 (키워드 검색 시 좌표 보정용) */
function getAreaCoordinates(area: string | null): { lat: number; lng: number } | null {
  if (!area) return null
  const coords: Record<string, { lat: number; lng: number }> = {
    "강남": { lat: 37.4979, lng: 127.0276 },
    "강남역": { lat: 37.4979, lng: 127.0276 },
    "성수": { lat: 37.5445, lng: 127.0567 },
    "성수동": { lat: 37.5445, lng: 127.0567 },
    "홍대": { lat: 37.5563, lng: 126.9236 },
    "홍대입구": { lat: 37.5563, lng: 126.9236 },
    "이태원": { lat: 37.5340, lng: 126.9948 },
    "여의도": { lat: 37.5219, lng: 126.9245 },
    "종로": { lat: 37.5704, lng: 126.9922 },
    "광화문": { lat: 37.5760, lng: 126.9769 },
    "신촌": { lat: 37.5598, lng: 126.9425 },
    "잠실": { lat: 37.5133, lng: 127.1001 },
    "합정": { lat: 37.5496, lng: 126.9139 },
    "연남": { lat: 37.5660, lng: 126.9246 },
    "연남동": { lat: 37.5660, lng: 126.9246 },
    "망원": { lat: 37.5564, lng: 126.9104 },
    "을지로": { lat: 37.5660, lng: 126.9910 },
    "압구정": { lat: 37.5270, lng: 127.0286 },
    "청담": { lat: 37.5243, lng: 127.0474 },
    "서울숲": { lat: 37.5444, lng: 127.0374 },
    "건대": { lat: 37.5406, lng: 127.0694 },
    "건대입구": { lat: 37.5406, lng: 127.0694 },
  }
  // Exact match
  if (coords[area]) return coords[area]
  // Partial match
  for (const [key, coord] of Object.entries(coords)) {
    if (area.includes(key) || key.includes(area)) return coord
  }
  return null
}

function isNameMatch(kakaoName: string, llmName: string): boolean {
  const normalize = (s: string) =>
    s.replace(/\s+/g, "")
      .replace(/[^가-힣a-zA-Z0-9]/g, "")
      .toLowerCase()

  const a = normalize(kakaoName)
  const b = normalize(llmName)

  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true

  // Meaningful substring match (min 4 chars or 50% of shorter)
  const shorter = a.length < b.length ? a : b
  const longer = a.length < b.length ? b : a
  const minLen = Math.max(4, Math.floor(shorter.length / 2))
  if (shorter.length >= minLen) {
    for (let len = shorter.length; len >= minLen; len--) {
      for (let i = 0; i <= shorter.length - len; i++) {
        if (longer.includes(shorter.slice(i, i + len))) return true
      }
    }
  }
  return false
}

function estimateFallbackScore(
  candidate: CandidateRaw,
  context: { query: string | null; area: string | null; scene: string | null; genreLabel: string | null },
): number {
  let score = 40
  const nameAndCategory = `${candidate.name} ${candidate.category}`.toLowerCase()

  if (context.query) {
    const queryLower = context.query.toLowerCase()
    if (nameAndCategory.includes(queryLower)) {
      score += 30
    } else {
      const keywords = queryLower.split(/\s+/)
      const matchCount = keywords.filter((kw) => nameAndCategory.includes(kw)).length
      score += Math.min(20, matchCount * 10)
    }
  }

  if (context.area) {
    const addr = `${candidate.address} ${candidate.roadAddress}`
    if (addr.includes(context.area.split("/")[0])) score += 10
  }

  if (context.genreLabel && nameAndCategory.includes(context.genreLabel.toLowerCase())) {
    score += 10
  }

  if (candidate.internalRecordCount > 0) score += 5

  return Math.min(85, score)
}

function generateFallbackReason(
  candidate: CandidateRaw,
  context: { query: string | null; scene: string | null; area: string | null; candidateGenre: string | null },
): string | null {
  const nameAndCategory = `${candidate.name} ${candidate.category}`.toLowerCase()

  if (context.query) {
    const queryLower = context.query.toLowerCase()
    if (nameAndCategory.includes(queryLower)) {
      const parts = [context.area, context.query].filter(Boolean)
      return `${parts.join(" ")} 검색에 딱 맞는 곳이에요`
    }
  }

  if (context.scene && context.area) {
    return `${context.area}에서 ${context.scene}하기 좋은 곳이에요`
  }

  return null
}

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

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 평판 시그널 → ReputationBadge[] 변환 */
function buildBadges(sig: ReputationSignal | null): ReputationBadge[] {
  if (!sig) return []
  const badges: ReputationBadge[] = []

  if (sig.michelin) {
    const label = sig.michelin === "bib" ? "미슐랭 빕구르망"
      : sig.michelin === "1star" ? "미슐랭 1스타"
      : sig.michelin === "2star" ? "미슐랭 2스타"
      : sig.michelin === "3star" ? "미슐랭 3스타"
      : `미슐랭 ${sig.michelin}`
    badges.push({ type: "michelin", label })
  }

  if (sig.blue_ribbon && sig.blue_ribbon > 0) {
    badges.push({ type: "blue_ribbon", label: `블루리본 ${sig.blue_ribbon}` })
  }

  if (sig.tv_shows?.length) {
    badges.push({ type: "tv", label: sig.tv_shows[0] })
  }

  if (sig.estimated_years && sig.estimated_years >= 5) {
    badges.push({ type: "nofo", label: `${sig.estimated_years}년 노포` })
  }

  if (sig.is_specialty) {
    badges.push({ type: "specialty", label: "전문점" })
  }

  if (sig.catch_table) {
    badges.push({ type: "catch_table", label: "캐치테이블" })
  }

  return badges
}

/** 시그널 가격대 → practicalInfo.priceRange 변환 */
function mapPriceRange(price: string): string | null {
  if (price.includes("~1만") || price.includes("1만 이하")) return "budget"
  if (price.includes("1~2만")) return "budget"
  if (price.includes("2~3만")) return "mid"
  if (price.includes("3~5만")) return "high"
  if (price.includes("5만")) return "premium"
  return null
}
