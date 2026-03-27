import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { RecommendationCard } from '@/domain/entities/recommendation'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ cards: [] }, { status: 401 })
  }

  // 사용자가 속한 버블 ID 목록
  const { data: memberships } = await supabase
    .from('bubble_members')
    .select('bubble_id')
    .eq('user_id', user.id)

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const bubbleIds = memberships.map((m) => m.bubble_id)

  const { data: shares } = await supabase
    .from('bubble_shares')
    .select('target_id, target_type, satisfaction, bubble_id, bubbles(name), restaurants(name, genre, photo_url)')
    .in('bubble_id', bubbleIds)
    .not('satisfaction', 'is', null)
    .gte('satisfaction', 80)
    .neq('user_id', user.id)
    .order('satisfaction', { ascending: false })
    .limit(20)

  if (!shares || shares.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const seen = new Set<string>()
  const cards: RecommendationCard[] = []

  for (const s of shares) {
    if (seen.has(s.target_id)) continue
    seen.add(s.target_id)

    const restaurant = s.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null
    const bubble = s.bubbles as unknown as { name: string } | null

    cards.push({
      id: `bubble-${s.target_id}`,
      targetId: s.target_id,
      targetType: s.target_type as 'restaurant' | 'wine',
      name: restaurant?.name ?? '',
      meta: restaurant?.genre ?? '',
      photoUrl: restaurant?.photo_url ?? null,
      algorithm: 'bubble',
      reason: `${bubble?.name ?? '버블'} 추천 · 만족도 ${s.satisfaction}%`,
      normalizedScore: (s.satisfaction ?? 0) / 100,
      confidence: null,
    })

    if (cards.length >= 5) break
  }

  return NextResponse.json({ cards })
}
