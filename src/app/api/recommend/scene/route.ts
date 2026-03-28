import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { RecommendationCard } from '@/domain/entities/recommendation'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ cards: [] }, { status: 401 })
  }

  const scene = request.nextUrl.searchParams.get('scene')
  if (!scene) {
    return NextResponse.json({ cards: [] })
  }

  const { data: records } = await supabase
    .from('records')
    .select('target_id, target_type, satisfaction, scene, restaurants(name, genre, photo_url)')
    .eq('user_id', user.id)
    .eq('scene', scene)
    .not('satisfaction', 'is', null)
    .gte('satisfaction', 75)
    .order('satisfaction', { ascending: false })
    .limit(20)

  if (!records || records.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const seen = new Set<string>()
  const cards: RecommendationCard[] = []

  for (const r of records) {
    if (seen.has(r.target_id)) continue
    seen.add(r.target_id)

    const restaurant = r.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null

    cards.push({
      id: `scene-${r.target_id}`,
      targetId: r.target_id,
      targetType: r.target_type as 'restaurant' | 'wine',
      name: restaurant?.name ?? '',
      meta: restaurant?.genre ?? '',
      photoUrl: restaurant?.photo_url ?? null,
      algorithm: 'scene',
      source: 'ai',
      reason: `${scene} · 만족도 ${r.satisfaction}%`,
      normalizedScore: (r.satisfaction ?? 0) / 100,
      confidence: null,
    })

    if (cards.length >= 10) break
  }

  return NextResponse.json({ cards })
}
