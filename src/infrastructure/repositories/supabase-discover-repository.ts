import type { DiscoverRepository } from '@/domain/repositories/discover-repository'
import type { DiscoverCard } from '@/domain/entities/discover'
import { createClient } from '@/infrastructure/supabase/client'
import { calculateCompositeScore } from '@/domain/services/composite-score'

export class SupabaseDiscoverRepository implements DiscoverRepository {
  private get supabase() {
    return createClient()
  }

  async getByArea(area: string, page: number, limit: number): Promise<DiscoverCard[]> {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error } = await this.supabase
      .from('restaurants')
      .select('id, name, genre, area, specialty, photo_url, nyam_score, michelin_stars, blue_ribbon, naver_rating, kakao_rating, google_rating, external_avg, record_count')
      .eq('area', area)
      .range(from, to)
      .order('nyam_score', { ascending: false, nullsFirst: false })

    if (error) throw new Error(`Discover 조회 실패: ${error.message}`)

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      genre: row.genre,
      area: row.area,
      specialty: row.specialty ?? null,
      photoUrl: row.photo_url,
      nyamScore: row.nyam_score,
      compositeScore: calculateCompositeScore(
        row.external_avg ?? 0,
        row.nyam_score ?? 0,
        row.record_count ?? 0,
        (row.michelin_stars ?? 0) > 0 || (row.blue_ribbon ?? false),
      ),
      michelinStars: row.michelin_stars,
      hasBlueRibbon: row.blue_ribbon ?? false,
      naverRating: row.naver_rating ?? null,
      kakaoRating: row.kakao_rating ?? null,
      googleRating: row.google_rating ?? null,
    }))
  }
}
