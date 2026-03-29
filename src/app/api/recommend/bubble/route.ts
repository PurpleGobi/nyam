import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { calcBubbleScore } from '@/domain/services/recommendation-service'
import type { RecommendationCard, RecommendationSource } from '@/domain/entities/recommendation'
import { fetchEngagementCounts } from '@/app/api/recommend/_shared/engagement'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ cards: [] }, { status: 401 })
  }

  // 사용자가 속한 버블 ID 목록 (active만)
  const { data: memberships } = await supabase
    .from('bubble_members')
    .select('bubble_id, bubbles(name, visibility)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const bubbleIds = memberships.map((m) => m.bubble_id)
  const bubbleMap = new Map(
    memberships.map((m) => [
      m.bubble_id,
      m.bubbles as unknown as { name: string; visibility: string } | null,
    ]),
  )

  // 해당 버블 멤버들의 user_id
  const { data: memberUserIds } = await supabase
    .from('bubble_members')
    .select('user_id, bubble_id')
    .in('bubble_id', bubbleIds)
    .eq('status', 'active')
    .neq('user_id', user.id)

  if (!memberUserIds || memberUserIds.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const userIds = [...new Set(memberUserIds.map((m) => m.user_id))]
  const userBubbleMap = new Map<string, string>()
  for (const m of memberUserIds) {
    userBubbleMap.set(m.user_id, m.bubble_id)
  }

  // 멤버들의 고평가 기록
  const { data: records } = await supabase
    .from('records')
    .select('target_id, target_type, avg_satisfaction, user_id, restaurants(name, genre, photo_url)')
    .in('user_id', userIds)
    .eq('target_type', 'restaurant')
    .not('avg_satisfaction', 'is', null)
    .gte('avg_satisfaction', 80)
    .order('avg_satisfaction', { ascending: false })
    .limit(30)

  if (!records || records.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  // 내가 이미 방문한 식당 제외
  const { data: myRecords } = await supabase
    .from('records')
    .select('target_id')
    .eq('user_id', user.id)
    .eq('target_type', 'restaurant')

  const myVisited = new Set((myRecords ?? []).map((r) => r.target_id))

  // target_id별 집계: 평균 만족도 + 평가 멤버 수 (RECOMMENDATION.md §6)
  const grouped = new Map<string, {
    targetId: string
    targetType: string
    totalSat: number
    memberCount: number
    memberIds: Set<string>
    restaurant: { name: string; genre: string | null; photo_url: string | null } | null
    bubbleId: string
  }>()

  for (const r of records) {
    if (myVisited.has(r.target_id)) continue

    const existing = grouped.get(r.target_id)
    if (existing) {
      if (!existing.memberIds.has(r.user_id)) {
        existing.totalSat += r.avg_satisfaction ?? 0
        existing.memberCount += 1
        existing.memberIds.add(r.user_id)
      }
    } else {
      const restaurant = r.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null
      const bubbleId = userBubbleMap.get(r.user_id) ?? bubbleIds[0]
      grouped.set(r.target_id, {
        targetId: r.target_id,
        targetType: r.target_type,
        totalSat: r.avg_satisfaction ?? 0,
        memberCount: 1,
        memberIds: new Set([r.user_id]),
        restaurant,
        bubbleId,
      })
    }
  }

  const scored: Array<RecommendationCard & { score: number }> = []

  for (const [, g] of grouped) {
    const avgSat = g.totalSat / g.memberCount
    const score = calcBubbleScore(avgSat, g.memberCount)
    const bubble = bubbleMap.get(g.bubbleId)

    // private 버블 → source='ai', 버블 존재 비노출 (RECOMMENDATION.md §2-6)
    const isPrivate = bubble?.visibility === 'private'
    const source: RecommendationSource = isPrivate ? 'ai' : 'bubble'
    const reason = isPrivate
      ? `만족도 ${Math.round(avgSat)}%`
      : `${bubble?.name ?? '버블'} 추천 · 만족도 ${Math.round(avgSat)}%`

    scored.push({
      id: `bubble-${g.targetId}`,
      targetId: g.targetId,
      targetType: g.targetType as 'restaurant' | 'wine',
      name: g.restaurant?.name ?? '',
      meta: g.restaurant?.genre ?? '',
      photoUrl: g.restaurant?.photo_url ?? null,
      algorithm: 'bubble',
      source,
      reason,
      normalizedScore: score,
      confidence: null,
      likeCount: 0,
      commentCount: 0,
      score,
    })
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, 10)

  const engagement = await fetchEngagementCounts(supabase, top.map((c) => c.targetId), 'restaurant')
  const cards: RecommendationCard[] = top.map(({ score: _score, ...card }) => {
    const eng = engagement.get(card.targetId)
    return { ...card, likeCount: eng?.likes ?? 0, commentCount: eng?.comments ?? 0 }
  })

  return NextResponse.json({ cards }, {
    headers: { 'Cache-Control': 'public, max-age=1800' },
  })
}
