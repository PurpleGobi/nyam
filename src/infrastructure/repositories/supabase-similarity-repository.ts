import { createClient } from '@/infrastructure/supabase/client'
import type {
  SimilarityRepository,
  SimilarityCategory,
  UserScoreMean,
  UserSimilarityRow,
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
}
