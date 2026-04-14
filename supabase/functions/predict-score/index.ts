import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ===== CORS =====
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ===== CF 파라미터 (cf-calculator.ts와 동일) =====
const D = 60
const LAMBDA = 7
const BOOST_FOLLOWING = 1.5  // 팔로우(맞팔 포함) 부스트
const BOOST_NONE = 1.0
const CONFIDENCE_N_WEIGHT = 0.50
const CONFIDENCE_AGREEMENT_WEIGHT = 0.35
const CONFIDENCE_QUALITY_WEIGHT = 0.15
const MIN_OVERLAP = 1
const TOP_K = 50
const BASE_WEIGHT = 0.1
const SHRINKAGE_LAMBDA = 10  // shrinkage 강도: 기록 10개쯤부터 유저 고유 평균 지배적

// ===== 인라인 타입 =====

interface ScorePoint { x: number; y: number }

type RelationType = 'following' | 'none'

interface RaterInput {
  deviation: ScorePoint
  similarity: number
  confidence: number
  boost: number
}

interface PredictionResult {
  predictedX: number
  predictedY: number
  satisfaction: number
  confidence: number
  nRaters: number
}

// ===== 인라인 CF 함수 (cf-calculator.ts 동일 로직) =====

function computeMeanCentered(scores: ScorePoint[]): ScorePoint {
  if (scores.length === 0) return { x: 50, y: 50 }
  let sumX = 0
  let sumY = 0
  for (const s of scores) {
    sumX += s.x
    sumY += s.y
  }
  return { x: sumX / scores.length, y: sumY / scores.length }
}

function getRelationBoost(relation: RelationType, uniformBoost?: boolean): number {
  if (uniformBoost) return BOOST_NONE
  switch (relation) {
    case 'following':
      return BOOST_FOLLOWING
    case 'none':
      return BOOST_NONE
  }
}

function filterByMinOverlap<T extends { nOverlap: number }>(
  raters: T[],
  minOverlap?: number,
): T[] {
  return raters.filter(r => r.nOverlap >= (minOverlap ?? MIN_OVERLAP))
}

function selectTopK<T extends { similarity: number; confidence: number; boost: number }>(
  raters: T[],
  k?: number,
): T[] {
  const limit = k ?? TOP_K
  if (raters.length <= limit) return raters.slice()

  const withWeight = raters.map((r, index) => ({
    rater: r,
    weight: Math.abs(r.similarity * r.confidence * r.boost),
    index,
  }))

  withWeight.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    return a.index - b.index
  })

  return withWeight.slice(0, limit).map(item => item.rater)
}

function computePredictionConfidence(raters: RaterInput[]): number {
  const nRaters = raters.length
  if (nRaters === 0) return 0

  const nFactor = nRaters / (nRaters + LAMBDA)

  let sumAbsWeight = 0
  const weights: number[] = []
  for (const r of raters) {
    const w = r.similarity * r.confidence * r.boost
    weights.push(w)
    sumAbsWeight += Math.abs(w)
  }

  if (sumAbsWeight === 0) return nFactor * CONFIDENCE_N_WEIGHT

  let weightedMeanDevX = 0
  let weightedMeanDevY = 0
  for (let i = 0; i < nRaters; i++) {
    weightedMeanDevX += weights[i] * raters[i].deviation.x
    weightedMeanDevY += weights[i] * raters[i].deviation.y
  }
  weightedMeanDevX /= sumAbsWeight
  weightedMeanDevY /= sumAbsWeight

  let varianceX = 0
  let varianceY = 0
  for (let i = 0; i < nRaters; i++) {
    const diffX = raters[i].deviation.x - weightedMeanDevX
    const diffY = raters[i].deviation.y - weightedMeanDevY
    varianceX += weights[i] * diffX * diffX
    varianceY += weights[i] * diffY * diffY
  }
  varianceX /= sumAbsWeight
  varianceY /= sumAbsWeight

  const stdDev = Math.sqrt(Math.max(varianceX, varianceY))
  const agreement = Math.max(0, 1 - stdDev / 2)
  const avgWeight = sumAbsWeight / nRaters
  const quality = avgWeight / (avgWeight + 0.3)

  const conf =
    nFactor * CONFIDENCE_N_WEIGHT +
    agreement * CONFIDENCE_AGREEMENT_WEIGHT +
    quality * CONFIDENCE_QUALITY_WEIGHT

  return Math.min(1, Math.max(0, conf))
}

function computePrediction(
  myMean: ScorePoint,
  raters: RaterInput[],
): PredictionResult {
  if (raters.length === 0) {
    return {
      predictedX: myMean.x,
      predictedY: myMean.y,
      satisfaction: (myMean.x + myMean.y) / 2,
      confidence: 0,
      nRaters: 0,
    }
  }

  let sumWeightedDevX = 0
  let sumWeightedDevY = 0
  let sumAbsWeight = 0

  for (const r of raters) {
    const cfWeight = r.similarity * r.confidence * r.boost
    const weight = cfWeight > 1e-9 ? cfWeight : BASE_WEIGHT  // 겹침 없으면 기본 가중치
    sumWeightedDevX += weight * r.deviation.x
    sumWeightedDevY += weight * r.deviation.y
    sumAbsWeight += Math.abs(weight)
  }

  if (sumAbsWeight === 0) {
    return {
      predictedX: myMean.x,
      predictedY: myMean.y,
      satisfaction: (myMean.x + myMean.y) / 2,
      confidence: 0,
      nRaters: 0,
    }
  }

  const rawX = myMean.x + sumWeightedDevX / sumAbsWeight
  const rawY = myMean.y + sumWeightedDevY / sumAbsWeight

  const predictedX = Math.min(100, Math.max(0, rawX))
  const predictedY = Math.min(100, Math.max(0, rawY))
  const satisfaction = (predictedX + predictedY) / 2
  const confidence = computePredictionConfidence(raters)

  return { predictedX, predictedY, satisfaction, confidence, nRaters: raters.length }
}

// ===== Supabase 타입 =====
type SupabaseClient = ReturnType<typeof createClient>

// ===== 헬퍼: 팔로우 관계 판정 =====

// ===== Shrinkage Mean: 데이터량에 따라 유저평균 ↔ 전체평균 보간 =====

function shrinkageMean(
  userMean: ScorePoint,
  globalMean: ScorePoint,
  recordCount: number,
): ScorePoint {
  const n = recordCount
  const denom = n + SHRINKAGE_LAMBDA
  return {
    x: (userMean.x * n + globalMean.x * SHRINKAGE_LAMBDA) / denom,
    y: (userMean.y * n + globalMean.y * SHRINKAGE_LAMBDA) / denom,
  }
}

function determineRelation(
  userId: string,
  raterId: string,
  followSet: Set<string>,
): RelationType {
  return followSet.has(raterId) ? 'following' : 'none'
}

// ===== Edge Function 본체 =====

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // 환경변수
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing env' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // JWT 인증
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, serviceRoleKey)

  const jwt = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // 요청 파싱
  let payload: { user_id: string; item_id: string; category: string; scope?: string[] }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { user_id, item_id, category, scope } = payload

  // 본인 요청만 허용
  if (user.id !== user_id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await predictScoreForUser(supabase, user_id, item_id, category, scope)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})

// ===== 예측 로직 =====

async function predictScoreForUser(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  category: string,
  scope?: string[],
) {
  // Step 1: 아이템 기록자 조회
  let raterQuery = supabase
    .from('records')
    .select('user_id')
    .eq('target_id', itemId)
    .eq('target_type', category)
    .not('axis_x', 'is', null)
    .not('axis_y', 'is', null)
    .neq('user_id', userId)

  if (scope && scope.length > 0) {
    raterQuery = raterQuery.in('user_id', scope)
  }

  const { data: raterRows, error: raterError } = await raterQuery

  if (raterError) throw new Error(`기록자 조회 실패: ${raterError.message}`)

  const raterIds = [...new Set((raterRows ?? []).map((r: { user_id: string }) => r.user_id))]

  if (raterIds.length === 0) {
    return {
      predicted_x: 50,
      predicted_y: 50,
      satisfaction: 50,
      confidence: 0,
      n_raters: 0,
      breakdown: { following_raters: [], other_raters: { count: 0, avg_similarity: 0, avg_score: 0 } },
    }
  }

  // Step 2: 적합도 배치 조회
  const { data: simRows, error: simError } = await supabase
    .from('user_similarities')
    .select('user_a, user_b, similarity, confidence, n_overlap')
    .eq('category', category)
    .or(
      `and(user_a.eq.${userId},user_b.in.(${raterIds.join(',')})),` +
      `and(user_b.eq.${userId},user_a.in.(${raterIds.join(',')}))`
    )

  if (simError) throw new Error(`적합도 조회 실패: ${simError.message}`)

  // 적합도 맵 (raterId → { similarity, confidence, nOverlap })
  const simMap = new Map<string, { similarity: number; confidence: number; nOverlap: number }>()
  for (const row of (simRows ?? [])) {
    const otherUser = row.user_a === userId ? row.user_b : row.user_a
    simMap.set(otherUser, {
      similarity: row.similarity,
      confidence: row.confidence,
      nOverlap: row.n_overlap,
    })
  }

  // 버블 모드 판정 (scope가 있으면 버블)
  const isBubbleMode = scope !== undefined && scope.length > 0

  // Step 3: 팔로우 관계 배치 조회 (버블 모드에서는 균등 부스트이므로 조회 불필요)
  const followSet = new Set<string>()
  if (!isBubbleMode) {
    const { data: followRows, error: followError } = await supabase
      .from('follows')
      .select('follower_id, following_id')
      .eq('follower_id', userId)
      .in('following_id', raterIds)

    if (followError) throw new Error(`팔로우 조회 실패: ${followError.message}`)

    for (const row of (followRows ?? [])) {
      followSet.add(row.following_id)
    }
  }

  // Step 4: 전체 평균 + 내 평균 조회 → shrinkage 보정
  const [{ data: globalMeanRows }, { data: myMeanRow }] = await Promise.all([
    supabase
      .from('user_score_means')
      .select('mean_x, mean_y, record_count')
      .eq('category', category),
    supabase
      .from('user_score_means')
      .select('mean_x, mean_y, record_count')
      .eq('user_id', userId)
      .eq('category', category)
      .single(),
  ])

  // 전체 평균: 모든 유저의 record_count 가중 평균 (유저 수가 아닌 기록 수 기반)
  let globalMean: ScorePoint = { x: 50, y: 50 }
  if (globalMeanRows && globalMeanRows.length > 0) {
    let totalRecords = 0
    let sumX = 0
    let sumY = 0
    for (const row of globalMeanRows) {
      totalRecords += row.record_count
      sumX += row.mean_x * row.record_count
      sumY += row.mean_y * row.record_count
    }
    if (totalRecords > 0) {
      globalMean = { x: sumX / totalRecords, y: sumY / totalRecords }
    }
  }

  const myMean: ScorePoint = myMeanRow
    ? shrinkageMean(
        { x: myMeanRow.mean_x, y: myMeanRow.mean_y },
        globalMean,
        myMeanRow.record_count,
      )
    : globalMean

  // Step 5: 기록자 필터링 (적합도 있는 + MIN_OVERLAP 충족)
  interface RaterCandidate {
    raterId: string
    similarity: number
    confidence: number
    nOverlap: number
    boost: number
    relation: RelationType
  }

  const candidates: RaterCandidate[] = []
  for (const raterId of raterIds) {
    const sim = simMap.get(raterId)
    const relation = determineRelation(userId, raterId, followSet)
    const boost = getRelationBoost(relation, isBubbleMode)

    candidates.push({
      raterId,
      similarity: sim?.similarity ?? 0,
      confidence: sim?.confidence ?? 0,
      nOverlap: sim?.nOverlap ?? 0,
      boost,
      relation,
    })
  }

  // 겹침 있는 유저: CF 가중치, 없는 유저: BASE_WEIGHT로 참여
  const topK = selectTopK(candidates)

  if (topK.length === 0) {
    // 유효 평가자 없음 → 기록자 단순 평균으로 폴백 (신뢰도 0%)
    const { data: allScores } = await supabase
      .from('records')
      .select('axis_x, axis_y')
      .eq('target_id', itemId)
      .eq('target_type', category)
      .neq('user_id', userId)
      .not('axis_x', 'is', null)
      .not('axis_y', 'is', null)

    if (!allScores || allScores.length === 0) return null  // 기록자도 없음

    const avgX = allScores.reduce((s, r) => s + r.axis_x, 0) / allScores.length
    const avgY = allScores.reduce((s, r) => s + r.axis_y, 0) / allScores.length
    return {
      predicted_x: Math.round(avgX * 100) / 100,
      predicted_y: Math.round(avgY * 100) / 100,
      satisfaction: Math.round((avgX + avgY) / 2 * 100) / 100,
      confidence: 0,
      n_raters: allScores.length,
      breakdown: { following_raters: [], other_raters: { count: allScores.length, avg_similarity: 0, avg_score: Math.round((avgX + avgY) / 2 * 100) / 100 } },
    }
  }

  const topKRaterIds = topK.map(r => r.raterId)

  // Step 6: Top-K 기록자 점수 조회
  const { data: scoreRows, error: scoreError } = await supabase
    .from('records')
    .select('user_id, axis_x, axis_y')
    .eq('target_id', itemId)
    .eq('target_type', category)
    .in('user_id', topKRaterIds)
    .not('axis_x', 'is', null)
    .not('axis_y', 'is', null)

  if (scoreError) throw new Error(`기록자 점수 조회 실패: ${scoreError.message}`)

  const scoreMap = new Map<string, ScorePoint>()
  for (const row of (scoreRows ?? [])) {
    scoreMap.set(row.user_id, { x: row.axis_x, y: row.axis_y })
  }

  // Step 7: 기록자 평균 조회 → shrinkage 보정
  const { data: meanRows, error: meanError } = await supabase
    .from('user_score_means')
    .select('user_id, mean_x, mean_y, record_count')
    .eq('category', category)
    .in('user_id', topKRaterIds)

  if (meanError) throw new Error(`기록자 평균 조회 실패: ${meanError.message}`)

  const meanMap = new Map<string, ScorePoint>()
  for (const row of (meanRows ?? [])) {
    meanMap.set(row.user_id, shrinkageMean(
      { x: row.mean_x, y: row.mean_y },
      globalMean,
      row.record_count,
    ))
  }

  // Step 8: RaterInput 구성 + 예측 계산
  const raterInputs: RaterInput[] = []

  for (const cand of topK) {
    const score = scoreMap.get(cand.raterId)
    const raterMean = meanMap.get(cand.raterId)
    if (!score || !raterMean) continue

    raterInputs.push({
      deviation: {
        x: score.x - raterMean.x,
        y: score.y - raterMean.y,
      },
      similarity: cand.similarity,
      confidence: cand.confidence,
      boost: cand.boost,
    })
  }

  const prediction = computePrediction(myMean, raterInputs)

  // Step 9: Breakdown 구성
  const followingRaters = topK.filter(r => r.relation === 'following')
  const otherRaters = topK.filter(r => r.relation === 'none')

  // 닉네임 조회 (팔로잉 기록자만)
  const nicknameMap = new Map<string, string>()
  if (followingRaters.length > 0) {
    const followingIds = followingRaters.map(r => r.raterId)
    const { data: profileRows } = await supabase
      .from('users')
      .select('id, nickname')
      .in('id', followingIds)

    for (const row of (profileRows ?? [])) {
      nicknameMap.set(row.id, row.nickname ?? '')
    }
  }

  const followingRatersBreakdown = followingRaters.map(r => {
    const score = scoreMap.get(r.raterId)
    return {
      user_id: r.raterId,
      nickname: nicknameMap.get(r.raterId) ?? '',
      similarity: r.similarity,
      score: score ? (score.x + score.y) / 2 : 0,
      boost: r.boost,
    }
  })

  let otherAvgSim = 0
  let otherAvgScore = 0
  if (otherRaters.length > 0) {
    let simSum = 0
    let scoreSum = 0
    for (const r of otherRaters) {
      simSum += r.similarity
      const s = scoreMap.get(r.raterId)
      scoreSum += s ? (s.x + s.y) / 2 : 0
    }
    otherAvgSim = simSum / otherRaters.length
    otherAvgScore = scoreSum / otherRaters.length
  }

  return {
    predicted_x: prediction.predictedX,
    predicted_y: prediction.predictedY,
    satisfaction: prediction.satisfaction,
    confidence: prediction.confidence,
    n_raters: prediction.nRaters,
    breakdown: {
      following_raters: followingRatersBreakdown,
      other_raters: {
        count: otherRaters.length,
        avg_similarity: otherAvgSim,
        avg_score: otherAvgScore,
      },
    },
  }
}
