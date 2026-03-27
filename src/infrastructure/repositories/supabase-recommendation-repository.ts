import type {
  RecommendationRepository,
  RevisitCandidate,
  AuthorityCandidate,
  BubbleCandidate,
} from '@/domain/repositories/recommendation-repository'
import type { RecommendationCard } from '@/domain/entities/recommendation'
import { createClient } from '@/infrastructure/supabase/client'

export class SupabaseRecommendationRepository implements RecommendationRepository {
  private get supabase() {
    return createClient()
  }

  async getRevisitCandidates(userId: string): Promise<RevisitCandidate[]> {
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

  async getAuthorityCandidates(): Promise<AuthorityCandidate[]> {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('id, name, genre, photo_url, michelin_stars, blue_ribbon')
      .or('michelin_stars.gt.0,blue_ribbon.eq.true')
      .limit(20)

    if (error) throw new Error(`권위 후보 조회 실패: ${error.message}`)

    return (data ?? []).map((row) => {
      const badges: string[] = []
      if (row.michelin_stars && row.michelin_stars > 0) badges.push(`미쉐린 ${row.michelin_stars}스타`)
      if (row.blue_ribbon) badges.push('블루리본')

      return {
        targetId: row.id,
        name: row.name,
        meta: row.genre ?? '',
        photoUrl: row.photo_url,
        ratingCount: 0,
        badges,
      }
    })
  }

  async getBubbleCandidates(userId: string): Promise<BubbleCandidate[]> {
    const { data, error } = await this.supabase
      .from('bubble_shares')
      .select('target_id, target_type, satisfaction, bubbles(name), restaurants(name, genre, photo_url), wines(name, region, photo_url)')
      .not('satisfaction', 'is', null)
      .gte('satisfaction', 80)
      .limit(20)

    if (error) throw new Error(`버블 후보 조회 실패: ${error.message}`)

    // userId is used for filtering context — currently returns all bubble shares
    void userId

    return (data ?? []).map((row) => {
      const target = row.target_type === 'restaurant'
        ? (row.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null)
        : (row.wines as unknown as { name: string; region: string | null; photo_url: string | null } | null)

      return {
        targetId: row.target_id,
        targetType: row.target_type,
        name: target?.name ?? '',
        meta: ('genre' in (target ?? {})) ? (target as unknown as { genre: string | null })?.genre ?? '' : (target as unknown as { region: string | null })?.region ?? '',
        photoUrl: target?.photo_url ?? null,
        bubbleName: (row.bubbles as unknown as { name: string } | null)?.name ?? '',
        avgSatisfaction: row.satisfaction ?? 0,
      }
    })
  }

  async saveRecommendation(card: RecommendationCard): Promise<void> {
    const { error } = await this.supabase
      .from('recommendations')
      .insert({
        target_id: card.targetId,
        target_type: card.targetType,
        name: card.name,
        meta: card.meta,
        photo_url: card.photoUrl,
        algorithm: card.algorithm,
        reason: card.reason,
        normalized_score: card.normalizedScore,
        confidence: card.confidence,
      })

    if (error) throw new Error(`추천 저장 실패: ${error.message}`)
  }

  async dismissRecommendation(recommendationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recommendations')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', recommendationId)

    if (error) throw new Error(`추천 닫기 실패: ${error.message}`)
  }
}
