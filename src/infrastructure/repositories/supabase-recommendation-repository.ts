import type {
  RecommendationRepository,
  RevisitCandidate,
  AuthorityCandidate,
  BubbleCandidate,
  SceneCandidate,
  QuadrantCandidate,
  PairingCandidate,
} from '@/domain/repositories/recommendation-repository'
import type { RecommendationCard } from '@/domain/entities/recommendation'
import { createClient } from '@/infrastructure/supabase/client'

export class SupabaseRecommendationRepository implements RecommendationRepository {
  private get supabase() {
    return createClient()
  }

  async getRevisitCandidates(userId: string, limit = 20): Promise<RevisitCandidate[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select('target_id, target_type, satisfaction, visit_date, restaurants(name, genre, photo_url), wines(name, region, photo_url)')
      .eq('user_id', userId)
      .not('satisfaction', 'is', null)
      .gte('satisfaction', 80)
      .order('visit_date', { ascending: false })

    if (error) throw new Error(`재방문 후보 조회 실패: ${error.message}`)

    const grouped = new Map<string, RevisitCandidate>()

    for (const row of data ?? []) {
      const existing = grouped.get(row.target_id)
      const sat = row.satisfaction ?? 0
      const visitDate = row.visit_date ?? ''
      const daysSince = Math.floor(
        (Date.now() - new Date(visitDate).getTime()) / (1000 * 60 * 60 * 24),
      )

      const target = row.target_type === 'restaurant'
        ? (row.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null)
        : (row.wines as unknown as { name: string; region: string | null; photo_url: string | null } | null)

      if (existing) {
        existing.visitCount += 1
        existing.avgSatisfaction = (existing.avgSatisfaction * (existing.visitCount - 1) + sat) / existing.visitCount
        existing.daysSinceLastVisit = Math.min(existing.daysSinceLastVisit, daysSince)
      } else {
        grouped.set(row.target_id, {
          targetId: row.target_id,
          targetType: row.target_type,
          name: target?.name ?? '',
          meta: ('genre' in (target ?? {})) ? (target as unknown as { genre: string | null })?.genre ?? '' : (target as unknown as { region: string | null })?.region ?? '',
          photoUrl: target?.photo_url ?? null,
          avgSatisfaction: sat,
          daysSinceLastVisit: daysSince,
          visitCount: 1,
        })
      }
    }

    return Array.from(grouped.values())
  }

  async getAuthorityCandidates(area: string | null = null, limit = 20): Promise<AuthorityCandidate[]> {
    let query = this.supabase
      .from('restaurants')
      .select('id, name, genre, photo_url, michelin_stars, has_blue_ribbon, naver_rating, kakao_rating, google_rating')
      .or('michelin_stars.gt.0,has_blue_ribbon.eq.true,and(naver_rating.gte.4.3,kakao_rating.gte.4.0,google_rating.gte.4.2)')
      .limit(limit)

    if (area) {
      query = query.eq('area', area)
    }

    const { data, error } = await query

    if (error) throw new Error(`권위 후보 조회 실패: ${error.message}`)

    return (data ?? []).map((row) => ({
      targetId: row.id,
      name: row.name,
      meta: row.genre ?? '',
      photoUrl: row.photo_url,
      naverRating: row.naver_rating ? Number(row.naver_rating) : null,
      kakaoRating: row.kakao_rating ? Number(row.kakao_rating) : null,
      googleRating: row.google_rating ? Number(row.google_rating) : null,
      michelinStars: row.michelin_stars ?? null,
      hasBlueRibbon: row.has_blue_ribbon ?? false,
    }))
  }

  async getBubbleCandidates(userId: string, limit = 20): Promise<BubbleCandidate[]> {
    // 1. 사용자가 속한 버블 ID 목록 (active 멤버만)
    const { data: memberships, error: memError } = await this.supabase
      .from('bubble_members')
      .select('bubble_id, bubbles(name, visibility)')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (memError || !memberships || memberships.length === 0) return []

    const bubbleIds = memberships.map((m) => m.bubble_id)
    const bubbleMap = new Map(
      memberships.map((m) => [
        m.bubble_id,
        m.bubbles as unknown as { name: string; visibility: string } | null,
      ]),
    )

    // 2. 해당 버블 멤버들의 고평가 기록 (내 기록 제외)
    const { data: memberUserIds } = await this.supabase
      .from('bubble_members')
      .select('user_id, bubble_id')
      .in('bubble_id', bubbleIds)
      .eq('status', 'active')
      .neq('user_id', userId)

    if (!memberUserIds || memberUserIds.length === 0) return []

    const userIds = [...new Set(memberUserIds.map((m) => m.user_id))]
    const userBubbleMap = new Map<string, string>()
    for (const m of memberUserIds) {
      userBubbleMap.set(m.user_id, m.bubble_id)
    }

    // 3. 멤버들의 기록 중 satisfaction >= 80
    const { data: records, error } = await this.supabase
      .from('records')
      .select('target_id, target_type, satisfaction, user_id, restaurants(name, genre, photo_url), wines(name, region, photo_url)')
      .in('user_id', userIds)
      .eq('target_type', 'restaurant')
      .not('satisfaction', 'is', null)
      .gte('satisfaction', 80)
      .order('satisfaction', { ascending: false })
      .limit(30)

    if (error || !records || records.length === 0) return []

    // 4. 내가 이미 방문한 식당 제외
    const { data: myRecords } = await this.supabase
      .from('records')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')

    const myVisited = new Set((myRecords ?? []).map((r) => r.target_id))
    const seen = new Set<string>()
    const results: BubbleCandidate[] = []

    for (const row of records) {
      if (myVisited.has(row.target_id) || seen.has(row.target_id)) continue
      seen.add(row.target_id)

      const bubbleId = userBubbleMap.get(row.user_id) ?? bubbleIds[0]
      const bubble = bubbleMap.get(bubbleId)
      const target = row.target_type === 'restaurant'
        ? (row.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null)
        : (row.wines as unknown as { name: string; region: string | null; photo_url: string | null } | null)

      results.push({
        targetId: row.target_id,
        targetType: row.target_type as 'restaurant' | 'wine',
        name: target?.name ?? '',
        meta: ('genre' in (target ?? {})) ? (target as unknown as { genre: string | null })?.genre ?? '' : (target as unknown as { region: string | null })?.region ?? '',
        photoUrl: target?.photo_url ?? null,
        bubbleName: bubble?.name ?? '',
        avgSatisfaction: row.satisfaction ?? 0,
        isPrivateBubble: bubble?.visibility === 'private',
      })

      if (results.length >= 20) break
    }

    return results
  }

  async getSceneCandidates(userId: string, scene: string, limit = 10): Promise<SceneCandidate[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select('target_id, target_type, satisfaction, scene, restaurants(name, genre, photo_url)')
      .eq('user_id', userId)
      .eq('scene', scene)
      .not('satisfaction', 'is', null)
      .gte('satisfaction', 75)
      .order('satisfaction', { ascending: false })

    if (error) throw new Error(`상황 후보 조회 실패: ${error.message}`)

    const grouped = new Map<string, { sum: number; count: number; row: (typeof data)[0] }>()
    for (const row of data ?? []) {
      const existing = grouped.get(row.target_id)
      if (existing) {
        existing.sum += (row.satisfaction ?? 0)
        existing.count += 1
      } else {
        grouped.set(row.target_id, { sum: row.satisfaction ?? 0, count: 1, row })
      }
    }

    return Array.from(grouped.values())
      .map((g) => {
        const restaurant = g.row.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null
        return {
          targetId: g.row.target_id,
          targetType: g.row.target_type as 'restaurant' | 'wine',
          name: restaurant?.name ?? '',
          meta: restaurant?.genre ?? '',
          photoUrl: restaurant?.photo_url ?? null,
          avgSatisfaction: Math.round(g.sum / g.count),
          scene,
        }
      })
      .sort((a, b) => b.avgSatisfaction - a.avgSatisfaction)
      .slice(0, limit)
  }

  async getQuadrantCandidates(userId: string, params: {
    scene?: string
    axisXMin: number
    axisXMax: number
    axisYMin: number
    axisYMax: number
    minSatisfaction: number
  }, limit = 10): Promise<QuadrantCandidate[]> {
    let query = this.supabase
      .from('records')
      .select('target_id, target_type, satisfaction, axis_x, axis_y, restaurants(name, genre, photo_url)')
      .eq('user_id', userId)
      .not('satisfaction', 'is', null)
      .gte('satisfaction', params.minSatisfaction)
      .gte('axis_x', params.axisXMin)
      .lte('axis_x', params.axisXMax)
      .gte('axis_y', params.axisYMin)
      .lte('axis_y', params.axisYMax)
      .order('satisfaction', { ascending: false })

    if (params.scene) {
      query = query.eq('scene', params.scene)
    }

    const { data, error } = await query

    if (error) throw new Error(`사분면 후보 조회 실패: ${error.message}`)

    const seen = new Set<string>()
    const results: QuadrantCandidate[] = []
    for (const row of data ?? []) {
      if (seen.has(row.target_id)) continue
      seen.add(row.target_id)
      const restaurant = row.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null
      results.push({
        targetId: row.target_id,
        targetType: row.target_type as 'restaurant' | 'wine',
        name: restaurant?.name ?? '',
        meta: restaurant?.genre ?? '',
        photoUrl: restaurant?.photo_url ?? null,
        avgSatisfaction: row.satisfaction ?? 0,
        axisX: row.axis_x ?? 50,
        axisY: row.axis_y ?? 50,
      })
      if (results.length >= limit) break
    }
    return results
  }

  async getWinePairingCandidates(wineId: string): Promise<PairingCandidate[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select('target_id, satisfaction, wines(name, region, photo_url, pairing_categories)')
      .eq('target_type', 'wine')
      .eq('target_id', wineId)
      .not('satisfaction', 'is', null)
      .gte('satisfaction', 80)

    if (error) throw new Error(`페어링 후보 조회 실패: ${error.message}`)

    return (data ?? []).map((row) => {
      const wine = row.wines as unknown as { name: string; region: string | null; photo_url: string | null; pairing_categories: string[] | null } | null
      return {
        targetId: row.target_id,
        name: wine?.name ?? '',
        meta: wine?.region ?? '',
        photoUrl: wine?.photo_url ?? null,
        satisfaction: row.satisfaction ?? 0,
        pairingCategories: wine?.pairing_categories ?? [],
      }
    })
  }

  async saveRecommendation(userId: string, card: RecommendationCard): Promise<void> {
    const { error } = await this.supabase
      .from('ai_recommendations')
      .insert({
        user_id: userId,
        target_id: card.targetId,
        target_type: card.targetType,
        algorithm: card.algorithm,
        reason: card.reason,
        confidence: card.confidence,
      })

    if (error) throw new Error(`추천 저장 실패: ${error.message}`)
  }

  async dismissRecommendation(recommendationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_recommendations')
      .update({ is_dismissed: true })
      .eq('id', recommendationId)

    if (error) throw new Error(`추천 닫기 실패: ${error.message}`)
  }
}
