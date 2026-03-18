import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { searchRestaurantsByKeyword, searchNearbyRestaurants } from "@/infrastructure/api/kakao-local"
import { callGemini } from "@/infrastructure/api/gemini"
import { SupabaseDiscoverRepository } from "@/infrastructure/repositories/supabase-discover-repository"
import {
  calculateFinalScore,
  getTopTasteAxis,
  inferGenreFromCategory,
} from "@/domain/services/discover-scoring"
import type { CandidateRaw, DiscoverResult, TasteProfileAxis } from "@/domain/entities/discover"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"

/** LLM recommendation item - structured output from the ranking engine */
interface LlmRecommendation {
  rank: number
  name: string
  searchKeyword: string
  area: string
  genre: string | null
  totalScore: number
  scores: {
    contextFit: number
    authority: number
    publicReputation: number
    accessibility: number
    recency: number
    reviewReliability: number
  }
  oneLiner: string
  strengths: string[]
  weaknesses: string[]
  confidence: "high" | "medium" | "low"
  category: "safe" | "adventure" | "uncertain"
}

/**
 * GET /api/discover?area=성수&scene=데이트&genre=japanese&query=조용한 오마카세
 *
 * Pipeline:
 * 1. LLM 맛집 랭킹 엔진 (씬별 가중치 적용, 다출처 종합 평가)
 * 2. 카카오맵 실존 검증
 * 3. 내부 DB 보강 + 사용자 DNA 매칭
 * 4. LLM 점수 + DNA 점수 블렌딩 → 최종 순위
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

    // ═══ Step 1: LLM 랭킹 엔진 ═══
    const genreLabel = genre
      ? FOOD_CATEGORIES.find((c) => c.value === genre)?.label ?? genre
      : null

    // For nearby mode without area, use "현재 위치 주변" as area context for LLM
    const llmArea = area ?? (isNearbyMode ? "현재 위치 주변" : null)

    console.log("\n[Discover] ═══════════════════════════════════════")
    console.log(`[Discover] Step 1: LLM 랭킹 엔진`)
    console.log(`[Discover]   area=${llmArea} scenes=[${scenes.join(",")}] genre=${genre} query="${query ?? ""}" nearby=${isNearbyMode}`)

    let t0 = Date.now()
    const llmResult = await getLlmRecommendations({
      area: llmArea, scenes, genreLabel, query,
    })
    const llmRecommendations = llmResult.recommendations
    const step1Ms = Date.now() - t0

    const llmNames = llmRecommendations.map((r) => `#${r.rank} ${r.name}(${r.totalScore}점,${r.confidence},${r.category})`).join(", ")
    pipelineSteps.push({
      step: "LLM 랭킹 엔진",
      detail: `${llmRecommendations.length}개 추천: ${llmNames}`,
      durationMs: step1Ms,
    })

    console.log(`[Discover]   LLM returned ${llmRecommendations.length} recommendations (${step1Ms}ms):`)
    for (const r of llmRecommendations) {
      console.log(`[Discover]     #${r.rank} ${r.name} (${r.totalScore}점, ${r.confidence}, ${r.category}) keyword="${r.searchKeyword}"`)
    }

    // ═══ Step 2: 카카오맵 실존 검증 ═══
    console.log(`[Discover] Step 2: 카카오맵 실존 검증`)

    t0 = Date.now()
    const verifiedCandidates = await verifyWithKakao(llmRecommendations)
    const step2Ms = Date.now() - t0

    const verifiedNames = verifiedCandidates.map((v) => v.kakaoPlace.name).join(", ")
    const failedNames = llmRecommendations
      .filter((r) => !verifiedCandidates.some((v) => isNameMatch(v.kakaoPlace.name, r.name)))
      .map((r) => r.name)
    pipelineSteps.push({
      step: "카카오맵 실존 검증",
      detail: `통과 ${verifiedCandidates.length}/${llmRecommendations.length}: [${verifiedNames}]${failedNames.length > 0 ? ` | 탈락: [${failedNames.join(", ")}]` : ""}`,
      durationMs: step2Ms,
    })

    console.log(`[Discover]   Verified: ${verifiedCandidates.length}/${llmRecommendations.length} (${step2Ms}ms)`)
    for (const v of verifiedCandidates) {
      console.log(`[Discover]     [OK] ${v.kakaoPlace.name} (kakaoId=${v.kakaoPlace.externalId}, LLM=${v.llmScore}점)`)
    }

    // Nearby supplement: merge in Kakao nearby results when coordinates provided
    if (isNearbyMode && nearbyLat != null && nearbyLng != null) {
      console.log(`[Discover]   Nearby supplement: searching ${nearbyRadius}m around (${nearbyLat}, ${nearbyLng})`)
      const existingIds = new Set(verifiedCandidates.map((v) => v.kakaoPlace.externalId))
      const nearbyResults = await searchNearbyRestaurants(nearbyLat, nearbyLng, Math.min(nearbyRadius, 2000))
      let added = 0
      for (const r of nearbyResults) {
        if (!existingIds.has(r.externalId)) {
          verifiedCandidates.push({
            kakaoPlace: r,
            llmScore: 0,
            llmReason: null,
            llmCategory: null,
            llmStrengths: [],
            llmWeaknesses: [],
          })
          existingIds.add(r.externalId)
          added++
        }
      }
      console.log(`[Discover]   Nearby: added ${added} nearby candidates (total ${verifiedCandidates.length})`)
      pipelineSteps.push({
        step: "주변 식당 보충",
        detail: `${nearbyRadius}m 반경 ${nearbyResults.length}개 중 ${added}개 추가`,
        durationMs: 0,
      })
    }

    // Fallback: if too few verified, supplement with keyword search
    if (verifiedCandidates.length < 3) {
      console.log(`[Discover]   Fallback: 키워드 검색 보충`)
      const existingIds = new Set(verifiedCandidates.map((v) => v.kakaoPlace.externalId))

      // Primary fallback: user query + area (e.g. "종로 라멘")
      if (query) {
        const queryFallback = [area, query].filter(Boolean).join(" ")
        console.log(`[Discover]   Fallback query (primary): "${queryFallback}"`)
        const queryResults = await searchRestaurantsByKeyword(queryFallback)
        for (const r of queryResults) {
          if (!existingIds.has(r.externalId)) {
            verifiedCandidates.push({
              kakaoPlace: r,
              llmScore: 0,
              llmReason: null,
              llmCategory: null,
              llmStrengths: [],
              llmWeaknesses: [],
            })
            existingIds.add(r.externalId)
          }
        }
      }

      // Secondary fallback: area + genre + 맛집 (only if still not enough)
      if (verifiedCandidates.length < 5) {
        const genericFallback = [area, genreLabel ?? query, "맛집"].filter(Boolean).join(" ")
        console.log(`[Discover]   Fallback query (secondary): "${genericFallback}"`)
        const fallbackResults = await searchRestaurantsByKeyword(genericFallback)
        for (const r of fallbackResults) {
          if (!existingIds.has(r.externalId)) {
            verifiedCandidates.push({
              kakaoPlace: r,
              llmScore: 0,
              llmReason: null,
              llmCategory: null,
              llmStrengths: [],
              llmWeaknesses: [],
            })
            existingIds.add(r.externalId)
          }
        }
      }

      pipelineSteps.push({
        step: "Fallback 키워드 검색",
        detail: `보충 후 ${verifiedCandidates.length}개`,
        durationMs: 0,
      })
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

    // ═══ Step 3: 내부 DB + 사용자 DNA ═══
    const externalIds = verifiedCandidates.map((v) => v.kakaoPlace.externalId)

    console.log(`[Discover] Step 3: 내부 DB + DNA 로딩`)

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
    const step3Ms = Date.now() - t0

    pipelineSteps.push({
      step: "내부 DB + DNA 로딩",
      detail: `records=${recordCount} tasteDna=${tasteDnaResult ? "real" : "none"} internalMatch=${internalCandidates.length} blacklisted=${blacklisted.size}`,
      durationMs: step3Ms,
    })

    const internalMap = new Map(internalCandidates.map((c) => [c.externalId, c]))

    // Build verified data maps
    const llmDataMap = new Map(
      verifiedCandidates.map((v) => [v.kakaoPlace.externalId, v]),
    )

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

    // ═══ Step 4: LLM 기반 + DNA 매칭 보너스 스코어링 ═══
    const userTasteDna = tasteDnaResult
    const topTasteAxis = getTopTasteAxis(userTasteDna)
    const frequentAreas = styleDnaResult?.areas.slice(0, 5).map((a) => a.area) ?? []

    console.log(`[Discover] Step 4: LLM 기반 + DNA 매칭 보너스`)
    console.log(`[Discover]   User: records=${recordCount} tasteDna=${userTasteDna ? "real" : "none"} seedGenres=[${seedGenres.join(",")}]`)
    console.log(`[Discover]   Candidates: ${candidates.length} (blacklisted ${blacklisted.size})`)

    // DNA matching: LLM score is the base (100점 만점)
    // DNA similarity bonus: up to +15 or penalty: down to -15 (max ±15% of 100)
    const DNA_BONUS_MAX = 15

    console.log(`[Discover]   Scoring: LLM base + DNA match bonus (±${DNA_BONUS_MAX}점)`)

    t0 = Date.now()

    const scored = candidates.map((candidate) => {
      const candidateGenre = inferGenreFromCategory(candidate.category)
        ?? internalMap.get(candidate.kakaoId)?.genre
        ?? genre
        ?? null
      const isNew = !visitedSet.has(candidate.kakaoId)
      const llmData = llmDataMap.get(candidate.kakaoId)

      // DNA match calculation (taste similarity + style match)
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

      // LLM score is the base (0-100)
      // When LLM fails (fallback), estimate a base score from keyword/category relevance
      const llmScore = llmData?.llmScore ?? estimateFallbackScore(candidate, { query, area, scene, genreLabel })

      // DNA match: convert DNA overall (0-100) to a bonus/penalty (-DNA_BONUS_MAX ~ +DNA_BONUS_MAX)
      // DNA overall 50 = neutral (no bonus), >50 = bonus, <50 = penalty
      const dnaMatchRatio = dnaScores.overall > 0
        ? (dnaScores.overall - 50) / 50  // -1.0 ~ +1.0
        : 0
      const dnaBonus = Math.round(dnaMatchRatio * DNA_BONUS_MAX)

      // Final score = LLM base + DNA bonus, clamped to 0-100
      const finalScore = Math.max(0, Math.min(100, llmScore + dnaBonus))

      const scores = {
        ...dnaScores,
        overall: finalScore,
      }

      // Use LLM reason if available, then query-aware fallback, then template
      const reason = llmData?.llmReason
        ?? generateFallbackReason(candidate, { query, scene, area, candidateGenre })
        ?? generateTemplateReason(dominantFactor, {
          scene, area, candidateGenre, topTasteAxis,
          isFrequentArea: frequentAreas.some((fa) =>
            candidate.address.includes(fa) || candidate.roadAddress.includes(fa),
          ),
        })

      return {
        candidate, scores, reason, candidateGenre, isNew, dominantFactor, debug,
        llmScore, dnaBonus, llmCategory: llmData?.llmCategory ?? null,
        llmStrengths: llmData?.llmStrengths ?? [],
        llmWeaknesses: llmData?.llmWeaknesses ?? [],
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

    const step4Ms = Date.now() - t0

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

    // Build debug scoring results
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
      step: "LLM 기반 + DNA 매칭 보너스",
      detail: `LLM base + DNA match bonus (±${DNA_BONUS_MAX}점) | ${candidates.length}개 후보 → Top 5 선별`,
      durationMs: step4Ms,
    })

    // ═══ Step 5: 결과 패키징 ═══
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
      highlights: [
        ...buildHighlights(s.candidate),
        ...(s.llmCategory === "safe" ? ["안전픽"] : []),
        ...(s.llmCategory === "adventure" ? ["모험픽"] : []),
        ...(s.llmStrengths.length > 0 ? [s.llmStrengths[0]] : []),
      ].slice(0, 4),
      internalRecordCount: s.candidate.internalRecordCount,
      hasVisited: visitedSet.has(s.candidate.kakaoId),
      sourceCount: s.candidate.internalRecordCount > 0 ? 2 : 1,
      ...(isNearbyMode && nearbyLat != null && nearbyLng != null ? {
        distance: Math.round(haversineDistance(nearbyLat, nearbyLng, s.candidate.lat, s.candidate.lng)),
      } : {}),
    }))

    const response = NextResponse.json({
      success: true,
      source: "realtime",
      computedAt: new Date().toISOString(),
      results,
      filters: { area, scene, genre, query },
      cacheStatus: "ready",
      meta: {
        blendRatio: { llm: 100, dna: DNA_BONUS_MAX },
        llmCandidates: llmRecommendations.length,
        verifiedCandidates: verifiedCandidates.length,
        scoreDisclaimer: "점수는 LLM 평가 기반이며 개인 취향 매칭도에 따라 보정됩니다.",
      },
      debug: {
        pipeline: pipelineSteps,
        blendRatio: { llm: 100, dna: DNA_BONUS_MAX },
        llmCandidates: llmRecommendations.length,
        verifiedCandidates: verifiedCandidates.length,
        scoredResults: scoredDebugResults,
        prompt: llmResult.prompt,
        inputContext: llmResult.inputContext,
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
// Step 1: LLM 랭킹 엔진
// ─────────────────────────────────────────────────────────

/** 씬별 가중치 프롬프트 블록 */
function getSceneWeights(scene: string | null): string {
  const weights: Record<string, string> = {
    "혼밥": `[씬 가중치: 혼밥]
- 맥락 적합성 35 (1인석, 바석, 회전율, 대기 스트레스 낮음)
- 대중 평판 25
- 예약/웨이팅 접근성 20 (웨이팅 없거나 짧은 곳 우대)
- 권위 신호 5
- 최근성/트렌드성 10
- 리뷰 신뢰도 5`,
    "데이트": `[씬 가중치: 데이트]
- 맥락 적합성 35 (분위기, 소음도, 동선, 2인 테이블)
- 권위 신호 20
- 대중 평판 20
- 예약/웨이팅 접근성 10 (예약 안정성 중요)
- 최근성/트렌드성 10
- 리뷰 신뢰도 5`,
    "비즈니스": `[씬 가중치: 비즈니스/회식]
- 맥락 적합성 35 (단체석, 룸, 예약 편의성)
- 예약/웨이팅 접근성 25
- 대중 평판 20
- 권위 신호 10
- 최근성/트렌드성 5
- 리뷰 신뢰도 5`,
    "친구모임": `[씬 가중치: 친구모임]
- 맥락 적합성 30
- 대중 평판 25
- 예약/웨이팅 접근성 15
- 최근성/트렌드성 15
- 권위 신호 10
- 리뷰 신뢰도 5`,
    "가족": `[씬 가중치: 가족모임]
- 맥락 적합성 35 (주차, 아이동반, 메뉴 폭, 편안한 좌석)
- 대중 평판 25
- 예약/웨이팅 접근성 15
- 권위 신호 15
- 최근성/트렌드성 5
- 리뷰 신뢰도 5`,
    "술자리": `[씬 가중치: 술자리]
- 맥락 적합성 30 (늦은 영업, 안주력, 2차 연계성, 대화 가능)
- 예약/웨이팅 접근성 20
- 대중 평판 20
- 최근성/트렌드성 15
- 권위 신호 10
- 리뷰 신뢰도 5`,
  }

  return weights[scene ?? ""] ?? `[기본 가중치]
- 맥락 적합성 30
- 권위 신호 20
- 대중 평판 20
- 예약/웨이팅 접근성 15
- 최근성/트렌드성 10
- 리뷰 신뢰도 5`
}

/** 씬 → 추정 인원 */
function inferPartySize(scene: string | null): string {
  const map: Record<string, string> = {
    "혼밥": "1명",
    "데이트": "2명",
    "술자리": "2~4명",
    "비즈니스": "4~8명",
    "가족": "3~6명",
    "친구모임": "3~6명",
  }
  return map[scene ?? ""] ?? "2~4명"
}

/** Return type for LLM recommendations including prompt for debug */
interface LlmResult {
  recommendations: LlmRecommendation[]
  prompt: string
  inputContext: string
}

async function getLlmRecommendations(params: {
  area: string | null
  scenes: string[]
  genreLabel: string | null
  query: string | null
}): Promise<LlmResult> {
  const { area, scenes, genreLabel, query } = params
  const primaryScene = scenes[0] ?? null

  const contextParts: string[] = []
  if (query) contextParts.push(`★ 사용자 요청: "${query}" ← 이것이 가장 중요한 검색 의도입니다. 이 요청을 최우선으로 반영하세요.`)
  if (primaryScene) contextParts.push(`씬: ${scenes.join(", ")}`)
  if (area) contextParts.push(`장소: ${area}`)
  if (genreLabel) contextParts.push(`음식 장르: ${genreLabel}`)
  contextParts.push(`추정 인원: ${inferPartySize(primaryScene)}`)

  const prompt = `[역할]
당신은 한국 식당 추천을 위한 "랭킹 엔진 + 평가자 + 큐레이터"다.
사용자가 입력한 씬과 장소를 바탕으로 식당 후보를 탐색하고, 여러 출처를 종합 평가하여 점수화한 뒤, 가장 적합한 순서대로 추천한다.

────────────────
입력값
────────────────
${contextParts.join("\n")}

────────────────
평가 출처 (종합 참고)
────────────────
[예약/웨이팅/실수요 신호] 캐치테이블, 테이블링
[권위/전문가 신호] 미쉐린 가이드, 블루리본, 식신 등
[대중 평판 신호] 네이버/카카오/구글/포스퀘어 별점 및 리뷰
[비광고성 실사용 후기] 네이버 블로그, 유튜브, 인스타그램, 커뮤니티

중요: 광고/협찬/체험단 리뷰는 신뢰도를 낮춘다. 단순 노출량보다 "실제 방문 신호"와 "씬 적합성"을 우선한다.

────────────────
최우선 원칙
────────────────
1) 단순 유명세가 아니라 "이 씬에 얼마나 잘 맞는지"를 최우선으로 평가
2) 평점만 보지 말고 리뷰 수, 최근성, 플랫폼 간 일관성을 함께 평가
3) 오래된 명성보다 최근 3개월 내 실제 반응을 우선
4) 정보가 부족하면 억지로 확신하지 말고 confidence를 "low"로 표시
5) 결과는 반드시 "씬 적합성 중심"으로 정렬

────────────────
평가 항목과 씬별 가중치 (총 100점)
────────────────
${getSceneWeights(primaryScene)}

────────────────
세부 평가 기준
────────────────
[맥락 적합성] 인원 수용, 분위기, 메뉴 구성, 좌석 구조(바석/1인석/2인 테이블/단체석/룸), 대화 편의성, 회전율, 시간대 적합성
[권위 신호] 미쉐린(3스타→매우높음, 1스타→높음, 빕구르망→중상), 블루리본(3개→높음, 1개→보통이상). 씬에 안 맞으면 권위가 높아도 상위 배치 금지
[대중 평판] 여러 플랫폼 평점 비교, 리뷰 수 함께 고려, 리뷰 수 적은 고평점은 보수적 해석
[예약/웨이팅 접근성] 예약 가능 여부, 웨이팅 시간, 현실적 방문 난이도
[최근성/트렌드성] 최근 3개월 후기 존재, 최근 오픈/리뉴얼, 최신 반복 언급 장단점
[리뷰 신뢰도] 광고성 감점, 플랫폼 간 일관성 가점, 구체적 실경험 리뷰 우대

────────────────
랭킹 보정 규칙
────────────────
- 웨이팅 과도하면 감점
- 리뷰 수 매우 적으면 보수적 순위
- 혼밥: 1인 친화성, 회전 속도, 대기 스트레스 강하게 반영
- 데이트: 분위기, 소음도, 동선, 예약 안정성 강하게 반영
- 비즈니스/회식: 단체석, 룸, 예약 편의성 강하게 반영
- 술자리: 늦은 영업, 안주력, 2차 연계성 반영
- 가족: 주차, 아이 동반, 메뉴 폭, 편안한 좌석 반영
- 정보 충돌 시 충돌 사실을 약점에 명시

────────────────
탐색 절차
────────────────
1) 입력 해석 (★ "사용자 요청"이 있으면 그것이 핵심 검색 의도 — 장소/씬 필터는 보조 조건) → 2) 후보 15~30개 수집 → 3) 씬에 안 맞는 곳 제거 → 4) 6개 항목 점수화 + 가중치 적용 → 5) TOP 10 선별 (안전픽/모험픽 구분)

────────────────
출력 형식 (반드시 JSON만 출력)
────────────────
{
  "recommendations": [
    {
      "rank": 1,
      "name": "식당 정확한 이름 (실존 확인된 곳만)",
      "searchKeyword": "카카오맵 검색 키워드 (지역명+식당이름, 예: '성수 스시코지')",
      "area": "구체적 동네/역명",
      "genre": "한식/일식/양식/중식/고기/해산물/카페 등",
      "totalScore": 82,
      "scores": {
        "contextFit": 28,
        "authority": 15,
        "publicReputation": 17,
        "accessibility": 12,
        "recency": 7,
        "reviewReliability": 3
      },
      "oneLiner": "이 식당을 추천하는 핵심 이유 (1문장, 씬 맥락 포함)",
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "confidence": "high",
      "category": "safe"
    }
  ]
}

category 구분:
- "safe": 안전픽 (실패 확률 낮음)
- "adventure": 모험픽 (취향 타면 만족도 높음)
- "uncertain": 정보 부족하지만 가능성 있음

반드시 8~10개를 추천하세요. 카카오맵 검증에서 탈락할 수 있으니 넉넉히.
실존 확인이 안 되는 식당은 절대 포함하지 마세요.`

  const inputContext = contextParts.join(" | ")

  console.log("\n[Discover] ──── LLM 프롬프트 입력값 ────")
  console.log(`[Discover] 입력 컨텍스트:\n${contextParts.map((p) => `  ${p}`).join("\n")}`)
  console.log(`[Discover] 씬 가중치: ${primaryScene ?? "기본"}`)
  console.log(`[Discover] 프롬프트 길이: ${prompt.length}자`)
  console.log("[Discover] ──── 프롬프트 전문 ────")
  console.log(prompt)
  console.log("[Discover] ──── 프롬프트 끝 ────\n")

  try {
    const result = await callGemini([{ text: prompt }], 0.3) as {
      recommendations?: LlmRecommendation[]
    }

    if (!result.recommendations || !Array.isArray(result.recommendations)) {
      console.warn("[Discover] LLM returned invalid format, using fallback")
      return { recommendations: [], prompt, inputContext }
    }

    const recommendations = result.recommendations
      .filter((r) =>
        typeof r.name === "string" && r.name.length > 0 &&
        typeof r.searchKeyword === "string" && r.searchKeyword.length > 0 &&
        typeof r.totalScore === "number",
      )
      .slice(0, 10)
    return { recommendations, prompt, inputContext }
  } catch (err) {
    console.error("[Discover] LLM recommendation failed:", err)
    return { recommendations: [], prompt, inputContext }
  }
}

// ─────────────────────────────────────────────────────────
// Step 2: 카카오맵 실존 검증
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
  llmScore: number
  llmReason: string | null
  llmCategory: string | null
  llmStrengths: string[]
  llmWeaknesses: string[]
}

async function verifyWithKakao(
  recommendations: LlmRecommendation[],
): Promise<VerifiedCandidate[]> {
  if (recommendations.length === 0) return []

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

    const match = results.find((r) => isNameMatch(r.name, rec.name))
      ?? results[0]

    if (match && !seenIds.has(match.externalId)) {
      seenIds.add(match.externalId)
      verified.push({
        kakaoPlace: match,
        llmScore: rec.totalScore,
        llmReason: rec.oneLiner,
        llmCategory: rec.category,
        llmStrengths: rec.strengths ?? [],
        llmWeaknesses: rec.weaknesses ?? [],
      })
    }
  }

  return verified
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

/** Estimate a base score for fallback candidates (when LLM fails) */
function estimateFallbackScore(
  candidate: CandidateRaw,
  context: { query: string | null; area: string | null; scene: string | null; genreLabel: string | null },
): number {
  let score = 40 // base: decent default for a kakao-verified place

  const nameAndCategory = `${candidate.name} ${candidate.category}`.toLowerCase()

  // Query relevance bonus (most important)
  if (context.query) {
    const queryLower = context.query.toLowerCase()
    if (nameAndCategory.includes(queryLower)) {
      score += 30
    } else {
      // Partial match: check if any keyword in query matches
      const keywords = queryLower.split(/\s+/)
      const matchCount = keywords.filter((kw) => nameAndCategory.includes(kw)).length
      score += Math.min(20, matchCount * 10)
    }
  }

  // Area match bonus
  if (context.area) {
    const addr = `${candidate.address} ${candidate.roadAddress}`
    if (addr.includes(context.area.split("/")[0])) {
      score += 10
    }
  }

  // Genre match bonus
  if (context.genreLabel && nameAndCategory.includes(context.genreLabel.toLowerCase())) {
    score += 10
  }

  // Internal data bonus
  if (candidate.internalRecordCount > 0) score += 5

  return Math.min(85, score) // cap: fallback shouldn't score higher than good LLM results
}

/** Generate a context-aware reason for fallback candidates */
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

  return null // fall through to generateTemplateReason
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

/** Haversine distance in meters between two coordinates */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
