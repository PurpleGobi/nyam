import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ===== CF 파라미터 (cf-calculator.ts와 동일) =====
const D = 60
const LAMBDA = 7
const MIN_OVERLAP = 1
const NICHE_THRESHOLD = 0.10

// ===== 인라인 계산 함수 (cf-calculator.ts 동일 로직) =====

interface ScorePoint { x: number; y: number }

function computeMean(scores: ScorePoint[]): ScorePoint {
  if (scores.length === 0) return { x: 50, y: 50 }
  let sumX = 0
  let sumY = 0
  for (const s of scores) {
    sumX += s.x
    sumY += s.y
  }
  return { x: sumX / scores.length, y: sumY / scores.length }
}

function computeSimilarityFromDeviations(
  deviationsA: ScorePoint[],
  deviationsB: ScorePoint[],
): { similarity: number; confidence: number; nOverlap: number } {
  const n = deviationsA.length
  if (n === 0) return { similarity: 0, confidence: 0, nOverlap: 0 }

  let distSum = 0
  for (let i = 0; i < n; i++) {
    const dx = deviationsA[i].x - deviationsB[i].x
    const dy = deviationsA[i].y - deviationsB[i].y
    distSum += Math.sqrt(dx * dx + dy * dy)
  }

  const avgDist = distSum / n
  const similarity = Math.max(0, 1 - avgDist / D)
  const confidence = n / (n + LAMBDA)

  return { similarity, confidence, nOverlap: n }
}

// ===== Supabase client 타입 =====

type SupabaseClient = ReturnType<typeof createClient>

// ===== Edge Function 본체 =====

serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing env' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let payload: { user_id: string; item_id: string; category: string; action: string }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { user_id, item_id, category, action } = payload

  try {
    // Step 1: user_score_means 갱신 (해당 유저의 평균 재계산)
    await updateUserScoreMean(supabase, user_id, category)

    // Step 2: 해당 아이템의 다른 기록자 조회
    const otherRaters = await getOtherRatersForItem(supabase, item_id, category, user_id)

    // Step 3-5: 각 기록자와의 적합도 재계산
    for (const otherUserId of otherRaters) {
      await recomputeSimilarity(supabase, user_id, otherUserId, category)
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      pairs_updated: otherRaters.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// ===== Step 1: user_score_means 갱신 =====

async function updateUserScoreMean(
  supabase: SupabaseClient,
  userId: string,
  category: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('records')
    .select('axis_x, axis_y')
    .eq('user_id', userId)
    .eq('target_type', category)
    .not('axis_x', 'is', null)
    .not('axis_y', 'is', null)

  if (error) throw new Error(`records 조회 실패: ${error.message}`)

  const scores: ScorePoint[] = (data ?? []).map((r: { axis_x: number; axis_y: number }) => ({
    x: r.axis_x,
    y: r.axis_y,
  }))

  const mean = computeMean(scores)

  const { error: upsertError } = await supabase
    .from('user_score_means')
    .upsert({
      user_id: userId,
      category,
      mean_x: mean.x,
      mean_y: mean.y,
      record_count: scores.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,category' })

  if (upsertError) throw new Error(`user_score_means UPSERT 실패: ${upsertError.message}`)
}

// ===== Step 2: 해당 아이템의 다른 기록자 조회 =====

async function getOtherRatersForItem(
  supabase: SupabaseClient,
  itemId: string,
  category: string,
  excludeUserId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('records')
    .select('user_id')
    .eq('target_id', itemId)
    .eq('target_type', category)
    .not('axis_x', 'is', null)
    .not('axis_y', 'is', null)
    .neq('user_id', excludeUserId)

  if (error) throw new Error(`기록자 조회 실패: ${error.message}`)

  // 중복 제거
  const userIds = new Set((data ?? []).map((r: { user_id: string }) => r.user_id))
  return Array.from(userIds)
}

// ===== Step 3-5: 겹침 조회 + 적합도 계산 + UPSERT =====

async function recomputeSimilarity(
  supabase: SupabaseClient,
  userIdA: string,
  userIdB: string,
  category: string,
): Promise<void> {
  // 정규화: user_a < user_b
  const [userA, userB] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA]

  // 겹치는 아이템 조회: 두 유저가 모두 기록한 아이템
  const { data: recordsA, error: errA } = await supabase
    .from('records')
    .select('target_id, axis_x, axis_y')
    .eq('user_id', userA)
    .eq('target_type', category)
    .not('axis_x', 'is', null)
    .not('axis_y', 'is', null)

  const { data: recordsB, error: errB } = await supabase
    .from('records')
    .select('target_id, axis_x, axis_y')
    .eq('user_id', userB)
    .eq('target_type', category)
    .not('axis_x', 'is', null)
    .not('axis_y', 'is', null)

  if (errA) throw new Error(`유저 A 기록 조회 실패: ${errA.message}`)
  if (errB) throw new Error(`유저 B 기록 조회 실패: ${errB.message}`)

  // 겹침 찾기
  const mapB = new Map<string, { axis_x: number; axis_y: number }>()
  for (const r of (recordsB ?? [])) {
    mapB.set(r.target_id, { axis_x: r.axis_x, axis_y: r.axis_y })
  }

  // 각 유저의 평균 조회 (이미 Step 1에서 갱신됨)
  const { data: meanA } = await supabase
    .from('user_score_means')
    .select('mean_x, mean_y')
    .eq('user_id', userA)
    .eq('category', category)
    .single()

  const { data: meanB } = await supabase
    .from('user_score_means')
    .select('mean_x, mean_y')
    .eq('user_id', userB)
    .eq('category', category)
    .single()

  const mA: ScorePoint = meanA ? { x: meanA.mean_x, y: meanA.mean_y } : { x: 50, y: 50 }
  const mB: ScorePoint = meanB ? { x: meanB.mean_x, y: meanB.mean_y } : { x: 50, y: 50 }

  // mean-centered 편차 계산
  const deviationsA: ScorePoint[] = []
  const deviationsB: ScorePoint[] = []

  for (const rA of (recordsA ?? [])) {
    const rB = mapB.get(rA.target_id)
    if (!rB) continue
    deviationsA.push({ x: rA.axis_x - mA.x, y: rA.axis_y - mA.y })
    deviationsB.push({ x: rB.axis_x - mB.x, y: rB.axis_y - mB.y })
  }

  // 겹치는 아이템 ID 수집
  const overlapItemIds: string[] = []
  for (const rA of (recordsA ?? [])) {
    if (mapB.has(rA.target_id)) {
      overlapItemIds.push(rA.target_id)
    }
  }

  const nOverlap = deviationsA.length

  if (nOverlap < MIN_OVERLAP) {
    // 겹침 < 1 → 기존 행 삭제 (있으면)
    await supabase
      .from('user_similarities')
      .delete()
      .eq('user_a', userA)
      .eq('user_b', userB)
      .eq('category', category)
    return
  }

  // 적합도 계산
  const result = computeSimilarityFromDeviations(deviationsA, deviationsB)

  // 다양성 보정: 니치 겹침 비율 계산
  let nicheRatio = 1
  if (overlapItemIds.length > 0) {
    // 전체 유저 수 조회
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (totalUsers && totalUsers > 0) {
      // 겹치는 각 아이템의 기록자 수 조회
      const { data: raterCountRows } = await supabase
        .from('records')
        .select('target_id')
        .in('target_id', overlapItemIds)
        .eq('target_type', category)
        .not('axis_x', 'is', null)
        .not('axis_y', 'is', null)

      // 아이템별 기록자 수 집계
      const itemRaterCounts = new Map<string, number>()
      for (const row of (raterCountRows ?? [])) {
        itemRaterCounts.set(row.target_id, (itemRaterCounts.get(row.target_id) ?? 0) + 1)
      }

      const threshold = totalUsers * NICHE_THRESHOLD
      let nicheCount = 0
      for (const itemId of overlapItemIds) {
        const count = itemRaterCounts.get(itemId) ?? 0
        if (count <= threshold) nicheCount++
      }
      nicheRatio = nicheCount / overlapItemIds.length
    }
  }

  // 신뢰도에 다양성 보정 적용
  const correctedConfidence = result.confidence * nicheRatio

  // UPSERT
  const { error: upsertError } = await supabase
    .from('user_similarities')
    .upsert({
      user_a: userA,
      user_b: userB,
      category,
      similarity: result.similarity,
      confidence: correctedConfidence,
      n_overlap: result.nOverlap,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_a,user_b,category' })

  if (upsertError) throw new Error(`user_similarities UPSERT 실패: ${upsertError.message}`)
}
