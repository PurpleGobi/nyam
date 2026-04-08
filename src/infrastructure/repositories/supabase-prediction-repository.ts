import { createClient } from '@/infrastructure/supabase/client'
import type {
  PredictionRepository,
  PredictionWithBreakdown,
} from '@/domain/repositories/prediction-repository'
import type { SimilarityCategory } from '@/domain/repositories/similarity-repository'

interface EdgeFunctionRaterBreakdown {
  user_id: string
  nickname: string
  similarity: number
  score: number
  boost: number
}

interface EdgeFunctionOtherRaters {
  count: number
  avg_similarity: number
  avg_score: number
}

interface PredictScoreResponse {
  predicted_x: number
  predicted_y: number
  satisfaction: number
  confidence: number
  n_raters: number
  breakdown: {
    following_raters: EdgeFunctionRaterBreakdown[]
    other_raters: EdgeFunctionOtherRaters
  }
}

interface BatchPredictItem {
  item_id: string
  satisfaction: number
  confidence: number
}

interface BatchPredictResponse {
  predictions: BatchPredictItem[]
}

export class SupabasePredictionRepository implements PredictionRepository {
  private get supabase() { return createClient() }

  async predictScore(
    userId: string,
    itemId: string,
    category: SimilarityCategory,
    scope?: string[],
  ): Promise<PredictionWithBreakdown | null> {
    const { data, error } = await this.supabase.functions.invoke<PredictScoreResponse>(
      'predict-score',
      {
        body: { user_id: userId, item_id: itemId, category, scope },
      },
    )

    if (error) throw new Error(`predict-score 호출 실패: ${error.message}`)
    if (!data) return null

    return {
      predictedX: data.predicted_x,
      predictedY: data.predicted_y,
      satisfaction: data.satisfaction,
      confidence: data.confidence,
      nRaters: data.n_raters,
      breakdown: {
        followingRaters: (data.breakdown?.following_raters ?? []).map(
          (r) => ({
            userId: r.user_id,
            nickname: r.nickname,
            similarity: r.similarity,
            score: r.score,
            boost: r.boost,
          })
        ),
        otherRaters: {
          count: data.breakdown?.other_raters?.count ?? 0,
          avgSimilarity: data.breakdown?.other_raters?.avg_similarity ?? 0,
          avgScore: data.breakdown?.other_raters?.avg_score ?? 0,
        },
      },
    }
  }

  async batchPredict(
    userId: string,
    itemIds: string[],
    category: SimilarityCategory,
  ): Promise<Map<string, { satisfaction: number; confidence: number }>> {
    const { data, error } = await this.supabase.functions.invoke<BatchPredictResponse>(
      'batch-predict',
      {
        body: { user_id: userId, item_ids: itemIds, category },
      },
    )

    if (error) throw new Error(`batch-predict 호출 실패: ${error.message}`)

    const result = new Map<string, { satisfaction: number; confidence: number }>()
    for (const p of (data?.predictions ?? [])) {
      result.set(p.item_id, {
        satisfaction: p.satisfaction,
        confidence: p.confidence,
      })
    }
    return result
  }
}
