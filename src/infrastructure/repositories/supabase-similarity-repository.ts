import { createClient } from '@/infrastructure/supabase/client'
import type {
  SimilarityRepository,
  SimilarityCategory,
  UserScoreMean,
  UserSimilarityRow,
  BubbleSimilarityResult,
} from '@/domain/repositories/similarity-repository'
import type { SimilarityResult } from '@/domain/entities/similarity'

interface SimilarityDbRow {
  user_a: string
  user_b: string
  category: string
  similarity: number
  confidence: number
  n_overlap: number
}

function mapDbToSimilarityRow(row: SimilarityDbRow): UserSimilarityRow {
  return {
    userA: row.user_a,
    userB: row.user_b,
    category: row.category as SimilarityCategory,
    similarity: row.similarity,
    confidence: row.confidence,
    nOverlap: row.n_overlap,
  }
}

export class SupabaseSimilarityRepository implements SimilarityRepository {
  private get supabase() { return createClient() }

  async getSimilarity(
    userA: string,
    userB: string,
    category: SimilarityCategory,
  ): Promise<SimilarityResult | null> {
    // 정규화: user_a < user_b (CHECK 제약조건)
    const [a, b] = userA < userB ? [userA, userB] : [userB, userA]

    const { data, error } = await this.supabase
      .from('user_similarities')
      .select('similarity, confidence, n_overlap')
      .eq('user_a', a)
      .eq('user_b', b)
      .eq('category', category)
      .single()

    if (error || !data) return null

    return {
      similarity: data.similarity,
      confidence: data.confidence,
      nOverlap: data.n_overlap,
    }
  }

  async getSimilaritiesForUser(
    userId: string,
    category: SimilarityCategory,
  ): Promise<UserSimilarityRow[]> {
    // user_a 또는 user_b가 userId인 모든 행 조회
    const { data: dataA, error: errorA } = await this.supabase
      .from('user_similarities')
      .select('user_a, user_b, category, similarity, confidence, n_overlap')
      .eq('user_a', userId)
      .eq('category', category)

    const { data: dataB, error: errorB } = await this.supabase
      .from('user_similarities')
      .select('user_a, user_b, category, similarity, confidence, n_overlap')
      .eq('user_b', userId)
      .eq('category', category)

    if (errorA) throw new Error(`적합도 조회 실패 (user_a): ${errorA.message}`)
    if (errorB) throw new Error(`적합도 조회 실패 (user_b): ${errorB.message}`)

    return [...(dataA ?? []), ...(dataB ?? [])].map(mapDbToSimilarityRow)
  }

  async getUserScoreMean(
    userId: string,
    category: SimilarityCategory,
  ): Promise<UserScoreMean | null> {
    const { data, error } = await this.supabase
      .from('user_score_means')
      .select('mean_x, mean_y, record_count')
      .eq('user_id', userId)
      .eq('category', category)
      .single()

    if (error || !data) return null

    return {
      meanX: data.mean_x,
      meanY: data.mean_y,
      recordCount: data.record_count,
    }
  }

  async getBubbleSimilarities(
    userId: string,
    bubbleIds: string[],
    category: SimilarityCategory,
  ): Promise<BubbleSimilarityResult[]> {
    if (bubbleIds.length === 0) return []

    // 1. 해당 버블들의 active 멤버 목록 일괄 조회
    const { data: memberRows, error: memberError } = await this.supabase
      .from('bubble_members')
      .select('bubble_id, user_id')
      .in('bubble_id', bubbleIds)
      .eq('status', 'active')

    if (memberError) throw new Error(`버블 멤버 조회 실패: ${memberError.message}`)

    // 버블별 멤버 맵 (본인 제외)
    const bubbleMemberMap = new Map<string, string[]>()
    for (const row of (memberRows ?? [])) {
      if (row.user_id === userId) continue
      const list = bubbleMemberMap.get(row.bubble_id) ?? []
      list.push(row.user_id)
      bubbleMemberMap.set(row.bubble_id, list)
    }

    // 2. 나의 모든 적합도 한 번에 조회
    const allSims = await this.getSimilaritiesForUser(userId, category)
    const simMap = new Map<string, { similarity: number; confidence: number }>()
    for (const row of allSims) {
      const otherId = row.userA === userId ? row.userB : row.userA
      simMap.set(otherId, { similarity: row.similarity, confidence: row.confidence })
    }

    // 3. 버블별 신뢰도 가중 평균 계산
    const results: BubbleSimilarityResult[] = []
    for (const bubbleId of bubbleIds) {
      const members = bubbleMemberMap.get(bubbleId) ?? []
      if (members.length === 0) continue

      let sumWeighted = 0
      let sumConfidence = 0
      let matchedCount = 0

      for (const memberId of members) {
        const sim = simMap.get(memberId)
        if (!sim) continue
        sumWeighted += sim.similarity * sim.confidence
        sumConfidence += sim.confidence
        matchedCount++
      }

      if (matchedCount === 0) continue

      results.push({
        bubbleId,
        similarity: sumConfidence > 0 ? sumWeighted / sumConfidence : 0,
        avgConfidence: sumConfidence / matchedCount,
        matchedMembers: matchedCount,
        totalMembers: members.length,
      })
    }

    return results
  }
}
