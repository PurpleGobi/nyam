import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { RecommendationCard, RecommendationSource } from '@/domain/entities/recommendation'

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
    .select('target_id, target_type, satisfaction, user_id, restaurants(name, genre, photo_url)')
    .in('user_id', userIds)
    .eq('target_type', 'restaurant')
    .not('satisfaction', 'is', null)
    .gte('satisfaction', 80)
    .order('satisfaction', { ascending: false })
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
  const seen = new Set<string>()
  const cards: RecommendationCard[] = []

  for (const r of records) {
    if (myVisited.has(r.target_id) || seen.has(r.target_id)) continue
    seen.add(r.target_id)

    const restaurant = r.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null
    const bubbleId = userBubbleMap.get(r.user_id) ?? bubbleIds[0]
    const bubble = bubbleMap.get(bubbleId)

    // private 버블 → source='ai', 버블 존재 비노출 (RECOMMENDATION.md §2-6)
    const isPrivate = bubble?.visibility === 'private'
    const source: RecommendationSource = isPrivate ? 'ai' : 'bubble'
    const reason = isPrivate
      ? `만족도 ${r.satisfaction}%`
      : `${bubble?.name ?? '버블'} 추천 · 만족도 ${r.satisfaction}%`

    cards.push({
      id: `bubble-${r.target_id}`,
      targetId: r.target_id,
      targetType: r.target_type as 'restaurant' | 'wine',
      name: restaurant?.name ?? '',
      meta: restaurant?.genre ?? '',
      photoUrl: restaurant?.photo_url ?? null,
      algorithm: 'bubble',
      source,
      reason,
      normalizedScore: (r.satisfaction ?? 0) / 100,
      confidence: null,
    })

    if (cards.length >= 10) break
  }

  return NextResponse.json({ cards })
}
