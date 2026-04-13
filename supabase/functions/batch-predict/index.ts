import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ===== CORS =====
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ===== CF 파라미터 (cf-calculator.ts와 동일) =====
const LAMBDA = 7
const BOOST_FOLLOWING = 1.5  // 팔로우(맞팔 포함) 부스트
const BOOST_NONE = 1.0
const CONFIDENCE_N_WEIGHT = 0.50
const CONFIDENCE_AGREEMENT_WEIGHT = 0.35
const CONFIDENCE_QUALITY_WEIGHT = 0.15
const MIN_OVERLAP = 1
const TOP_K = 50
const BASE_WEIGHT = 0.1
const MAX_BATCH_SIZE = 50

// ===== 인라인 타입 =====

interface ScorePoint { x: number; y: number }

type RelationType = 'following' | 'none'

interface RaterInput {
  deviation: ScorePoint
  similarity: number
  confidence: number
  boost: number
}

// ===== 인라인 CF 함수 (cf-calculator.ts 동일 로직) =====

function getRelationBoost(relation: RelationType): number {
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

  const withWeight = raters.map((r, index) => {
    const cfW = r.similarity * r.confidence * r.boost
    return { rater: r, weight: Math.abs(cfW > 1e-9 ? cfW : BASE_WEIGHT), index }
  })

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
    const cfW = r.similarity * r.confidence * r.boost
    const w = cfW > 1e-9 ? cfW : BASE_WEIGHT
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
): { satisfaction: number; confidence: number } {
  if (raters.length === 0) {
    return {
      satisfaction: (myMean.x + myMean.y) / 2,
      confidence: 0,
    }
  }

  let sumWeightedDevX = 0
  let sumWeightedDevY = 0
  let sumAbsWeight = 0

  for (const r of raters) {
    const cfW = r.similarity * r.confidence * r.boost
    const weight = cfW > 1e-9 ? cfW : BASE_WEIGHT
    sumWeightedDevX += weight * r.deviation.x
    sumWeightedDevY += weight * r.deviation.y
    sumAbsWeight += Math.abs(weight)
  }

  if (sumAbsWeight === 0) {
    return {
      satisfaction: (myMean.x + myMean.y) / 2,
      confidence: 0,
    }
  }

  const rawX = myMean.x + sumWeightedDevX / sumAbsWeight
  const rawY = myMean.y + sumWeightedDevY / sumAbsWeight

  const predictedX = Math.min(100, Math.max(0, rawX))
  const predictedY = Math.min(100, Math.max(0, rawY))
  const satisfaction = (predictedX + predictedY) / 2
  const confidence = computePredictionConfidence(raters)

  return { satisfaction, confidence }
}

// ===== Supabase 타입 =====
type SupabaseClient = ReturnType<typeof createClient>

// ===== 헬퍼 =====

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
  let payload: { user_id: string; item_ids: string[]; category: string }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { user_id, item_ids, category } = payload

  // 본인 요청만 허용
  if (user.id !== user_id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // 배치 크기 제한
  if (!item_ids || item_ids.length === 0) {
    return new Response(JSON.stringify({ predictions: [] }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (item_ids.length > MAX_BATCH_SIZE) {
    return new Response(JSON.stringify({ error: `Maximum ${MAX_BATCH_SIZE} items per batch` }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const predictions = await batchPredictForUser(supabase, user_id, item_ids, category)

    return new Response(JSON.stringify({ predictions }), {
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

// ===== 배치 예측 로직 =====

async function batchPredictForUser(
  supabase: SupabaseClient,
  userId: string,
  itemIds: string[],
  category: string,
): Promise<Array<{ item_id: string; satisfaction: number; confidence: number }>> {

  // Step 1: 모든 아이템의 기록자 + 점수 (1회)
  const { data: allRecords, error: recError } = await supabase
    .from('records')
    .select('user_id, target_id, axis_x, axis_y')
    .in('target_id', itemIds)
    .eq('target_type', category)
    .not('axis_x', 'is', null)
    .not('axis_y', 'is', null)
    .neq('user_id', userId)

  if (recError) throw new Error(`기록 조회 실패: ${recError.message}`)

  // 아이템별 기록자 점수 맵
  const itemRaterScores = new Map<string, Map<string, ScorePoint>>()
  const allRaterIds = new Set<string>()

  for (const row of (allRecords ?? [])) {
    allRaterIds.add(row.user_id)
    let itemMap = itemRaterScores.get(row.target_id)
    if (!itemMap) {
      itemMap = new Map()
      itemRaterScores.set(row.target_id, itemMap)
    }
    itemMap.set(row.user_id, { x: row.axis_x, y: row.axis_y })
  }

  const raterIdArray = Array.from(allRaterIds)

  if (raterIdArray.length === 0) {
    return itemIds.map(id => ({ item_id: id, satisfaction: 50, confidence: 0 }))
  }

  // Step 2: 모든 기록자와의 적합도 (1회)
  const { data: simRows, error: simError } = await supabase
    .from('user_similarities')
    .select('user_a, user_b, similarity, confidence, n_overlap')
    .eq('category', category)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)

  if (simError) throw new Error(`적합도 조회 실패: ${simError.message}`)

  const simMap = new Map<string, { similarity: number; confidence: number; nOverlap: number }>()
  for (const row of (simRows ?? [])) {
    const otherUser = row.user_a === userId ? row.user_b : row.user_a
    if (allRaterIds.has(otherUser)) {
      simMap.set(otherUser, {
        similarity: row.similarity,
        confidence: row.confidence,
        nOverlap: row.n_overlap,
      })
    }
  }

  // Step 3: 팔로우 관계 (1회) — 내가 팔로우하는 유저만 조회
  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .in('following_id', raterIdArray)

  if (followError) throw new Error(`팔로우 조회 실패: ${followError.message}`)

  const followSet = new Set<string>()
  for (const row of (followRows ?? [])) {
    followSet.add(row.following_id)
  }

  // Step 4: 내 평균 (1회)
  const { data: myMeanRow } = await supabase
    .from('user_score_means')
    .select('mean_x, mean_y')
    .eq('user_id', userId)
    .eq('category', category)
    .single()

  const myMean: ScorePoint = myMeanRow
    ? { x: myMeanRow.mean_x, y: myMeanRow.mean_y }
    : { x: 50, y: 50 }

  // Step 5: 기록자 평균 (1회)
  const { data: meanRows, error: meanError } = await supabase
    .from('user_score_means')
    .select('user_id, mean_x, mean_y')
    .eq('category', category)
    .in('user_id', raterIdArray)

  if (meanError) throw new Error(`기록자 평균 조회 실패: ${meanError.message}`)

  const meanMap = new Map<string, ScorePoint>()
  for (const row of (meanRows ?? [])) {
    meanMap.set(row.user_id, { x: row.mean_x, y: row.mean_y })
  }

  // Step 6: 아이템별 예측 (메모리 내)
  interface RaterCandidate {
    raterId: string
    similarity: number
    confidence: number
    nOverlap: number
    boost: number
  }

  const results: Array<{ item_id: string; satisfaction: number; confidence: number }> = []

  for (const itemId of itemIds) {
    const itemScores = itemRaterScores.get(itemId)
    if (!itemScores || itemScores.size === 0) {
      results.push({ item_id: itemId, satisfaction: (myMean.x + myMean.y) / 2, confidence: 0 })
      continue
    }

    // 해당 아이템의 모든 기록자 (겹침 없어도 BASE_WEIGHT로 참여)
    const candidates: RaterCandidate[] = []
    for (const [raterId] of itemScores) {
      const sim = simMap.get(raterId)
      const relation = determineRelation(userId, raterId, followSet)
      const boost = getRelationBoost(relation)

      candidates.push({
        raterId,
        similarity: sim?.similarity ?? 0,
        confidence: sim?.confidence ?? 0,
        nOverlap: sim?.nOverlap ?? 0,
        boost,
      })
    }

    const topK = selectTopK(candidates)

    if (topK.length === 0) {
      // 유효 평가자 없음 → 기록자 단순 평균으로 폴백 (신뢰도 0%)
      const itemScoreMap = itemRaterScores.get(itemId)
      if (itemScoreMap && itemScoreMap.size > 0) {
        let sumX = 0, sumY = 0
        for (const s of itemScoreMap.values()) { sumX += s.x; sumY += s.y }
        const n = itemScoreMap.size
        results.push({ item_id: itemId, satisfaction: Math.round((sumX / n + sumY / n) / 2 * 100) / 100, confidence: 0 })
      }
      continue
    }

    // RaterInput 구성
    const raterInputs: RaterInput[] = []
    for (const cand of topK) {
      const score = itemScores.get(cand.raterId)
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
    results.push({
      item_id: itemId,
      satisfaction: prediction.satisfaction,
      confidence: prediction.confidence,
    })
  }

  return results
}
