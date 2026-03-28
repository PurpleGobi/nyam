import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 매주 월요일 00:00 UTC 실행.
 *
 * 처리 순서:
 * 1. 모든 활성 버블 조회
 * 2. 각 버블에 대해:
 *    a. 지난 주(월~일) 공유된 기록 집계 (bubble_shares → records)
 *    b. target별 평균 만족도 + 기록 수 산출
 *    c. 순위 매기기 (avg_satisfaction DESC, record_count DESC)
 *    d. bubble_ranking_snapshots UPSERT
 *    e. bubbles.weekly_record_count / prev_weekly_record_count 갱신
 *    f. bubble_members.weekly_share_count 리셋 (→ 0)
 */
serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  const expectedToken = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
  if (!authHeader || authHeader !== expectedToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date()
  const lastMonday = getLastMonday(now)
  const nextMonday = new Date(lastMonday)
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7)
  const periodStart = lastMonday.toISOString().split('T')[0]

  // 1. 모든 활성 버블 ID 조회
  const { data: bubbles } = await supabase
    .from('bubbles')
    .select('id')
    .gt('member_count', 0)

  if (!bubbles || bubbles.length === 0) {
    return new Response(JSON.stringify({ processed: 0, snapshots: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let totalSnapshots = 0

  for (const bubble of bubbles) {
    try {
      // 2. 지난 주 공유 기록 집계 → 스냅샷 생성
      const snapshots = await generateRankingSnapshots(
        supabase,
        bubble.id,
        lastMonday.toISOString(),
        nextMonday.toISOString(),
        periodStart,
      )

      if (snapshots.length > 0) {
        // 3. 스냅샷 UPSERT
        const { error } = await supabase
          .from('bubble_ranking_snapshots')
          .upsert(snapshots, {
            onConflict: 'bubble_id,target_id,target_type,period_start',
          })
        if (error) {
          // 개별 버블 실패 시 다음 버블 진행
        }
        totalSnapshots += snapshots.length
      }

      // 4. bubbles 비정규화 갱신
      await updateBubbleWeeklyStats(
        supabase,
        bubble.id,
        lastMonday.toISOString(),
        nextMonday.toISOString(),
      )

      // 5. bubble_members.weekly_share_count 리셋
      await resetMemberWeeklyShareCount(supabase, bubble.id)
    } catch {
      // 개별 버블 실패 시 다른 버블 계속 처리
    }
  }

  return new Response(
    JSON.stringify({ processed: bubbles.length, snapshots: totalSnapshots }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})

// ─── 핵심 함수 ───

interface SnapshotRow {
  bubble_id: string
  target_id: string
  target_type: string
  period_start: string
  rank_position: number
  avg_satisfaction: number | null
  record_count: number
}

async function generateRankingSnapshots(
  supabase: ReturnType<typeof createClient>,
  bubbleId: string,
  fromISO: string,
  toISO: string,
  periodStart: string,
): Promise<SnapshotRow[]> {
  // 지난 주 공유된 기록을 target별로 집계
  const { data: shares } = await supabase
    .from('bubble_shares')
    .select('record_id, records(target_id, target_type, satisfaction, status)')
    .eq('bubble_id', bubbleId)
    .gte('shared_at', fromISO)
    .lt('shared_at', toISO)

  if (!shares || shares.length === 0) return []

  // target별 집계
  const targetMap = new Map<string, { targetId: string; targetType: string; satisfactions: number[] }>()

  for (const share of shares) {
    const rec = share.records as Record<string, unknown> | null
    if (!rec) continue
    if (rec.status !== 'rated') continue
    if (rec.satisfaction == null) continue

    const key = `${rec.target_id}:${rec.target_type}`
    const existing = targetMap.get(key)
    if (existing) {
      existing.satisfactions.push(rec.satisfaction as number)
    } else {
      targetMap.set(key, {
        targetId: rec.target_id as string,
        targetType: rec.target_type as string,
        satisfactions: [rec.satisfaction as number],
      })
    }
  }

  // target_type별 순위 매기기
  const targets = Array.from(targetMap.values())
  const byType = new Map<string, typeof targets>()
  for (const t of targets) {
    const list = byType.get(t.targetType) ?? []
    list.push(t)
    byType.set(t.targetType, list)
  }

  const snapshots: SnapshotRow[] = []

  for (const [targetType, list] of byType) {
    // avg_satisfaction DESC, record_count DESC
    const sorted = list
      .map((t) => ({
        ...t,
        avgSatisfaction: Math.round((t.satisfactions.reduce((a, b) => a + b, 0) / t.satisfactions.length) * 10) / 10,
        recordCount: t.satisfactions.length,
      }))
      .sort((a, b) => {
        if (b.avgSatisfaction !== a.avgSatisfaction) return b.avgSatisfaction - a.avgSatisfaction
        return b.recordCount - a.recordCount
      })

    sorted.forEach((t, i) => {
      snapshots.push({
        bubble_id: bubbleId,
        target_id: t.targetId,
        target_type: targetType,
        period_start: periodStart,
        rank_position: i + 1,
        avg_satisfaction: t.avgSatisfaction,
        record_count: t.recordCount,
      })
    })
  }

  return snapshots
}

async function updateBubbleWeeklyStats(
  supabase: ReturnType<typeof createClient>,
  bubbleId: string,
  fromISO: string,
  toISO: string,
): Promise<void> {
  // 지난 주 공유 수 집계
  const { count } = await supabase
    .from('bubble_shares')
    .select('id', { count: 'exact', head: true })
    .eq('bubble_id', bubbleId)
    .gte('shared_at', fromISO)
    .lt('shared_at', toISO)

  // 현재 weekly → prev, 지난 주 공유 수 → weekly
  const { data: bubble } = await supabase
    .from('bubbles')
    .select('weekly_record_count')
    .eq('id', bubbleId)
    .single()

  await supabase
    .from('bubbles')
    .update({
      prev_weekly_record_count: bubble?.weekly_record_count ?? 0,
      weekly_record_count: count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bubbleId)
}

async function resetMemberWeeklyShareCount(
  supabase: ReturnType<typeof createClient>,
  bubbleId: string,
): Promise<void> {
  await supabase
    .from('bubble_members')
    .update({ weekly_share_count: 0 })
    .eq('bubble_id', bubbleId)
    .eq('status', 'active')
}

// ─── 날짜 헬퍼 ───

function getLastMonday(now: Date): Date {
  const d = new Date(now)
  const day = d.getUTCDay()
  const thisMondayOffset = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - thisMondayOffset - 7)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
