import { createClient } from '@/infrastructure/supabase/client'
import type {
  ExperienceAtlasRegion,
  ExperienceAtlasGenre,
  ExperienceAtlasScene,
} from '@/domain/entities/experience-atlas'
import type { ExperienceAtlasRepository } from '@/domain/repositories/experience-atlas-repository'
import type { Database } from '@/infrastructure/supabase/types'

type RegionRow = Database['public']['Tables']['experience_atlas_regions']['Row']
type GenreRow = Database['public']['Tables']['experience_atlas_genres']['Row']
type SceneRow = Database['public']['Tables']['experience_atlas_scenes']['Row']

function toRegion(row: RegionRow): ExperienceAtlasRegion {
  return {
    userId: row.user_id,
    region: row.region,
    recordCount: row.record_count,
    uniqueRestaurants: row.unique_restaurants,
    subRegionCount: row.sub_region_count,
    level: row.level,
    xp: row.xp,
    xpToNext: row.xp_to_next,
    volumeScore: row.volume_score,
    diversityScore: row.diversity_score,
    recencyScore: row.recency_score,
    consistencyScore: row.consistency_score,
    firstRecordAt: row.first_record_at ?? '',
    lastRecordAt: row.last_record_at ?? '',
  }
}

function toGenre(row: GenreRow): ExperienceAtlasGenre {
  return {
    userId: row.user_id,
    category: row.category,
    recordCount: row.record_count,
    subCategoryCount: row.sub_category_count,
    subCategories: row.sub_categories ?? [],
    avgRating: row.avg_rating ?? 0,
    percentage: row.percentage ?? 0,
    level: row.level,
    xp: row.xp,
    xpToNext: row.xp_to_next,
    volumeScore: row.volume_score,
    diversityScore: row.diversity_score,
    recencyScore: row.recency_score,
    consistencyScore: row.consistency_score,
    firstRecordAt: row.first_record_at ?? '',
    lastRecordAt: row.last_record_at ?? '',
  }
}

function toScene(row: SceneRow): ExperienceAtlasScene {
  return {
    userId: row.user_id,
    scene: row.scene,
    recordCount: row.record_count,
    uniqueRestaurants: row.unique_restaurants,
    categoryDiversity: row.category_diversity,
    level: row.level,
    xp: row.xp,
    xpToNext: row.xp_to_next,
    volumeScore: row.volume_score,
    diversityScore: row.diversity_score,
    recencyScore: row.recency_score,
    consistencyScore: row.consistency_score,
    firstRecordAt: row.first_record_at ?? '',
    lastRecordAt: row.last_record_at ?? '',
  }
}

export class SupabaseExperienceAtlasRepository implements ExperienceAtlasRepository {
  async getRegionsByUserId(userId: string): Promise<ExperienceAtlasRegion[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('experience_atlas_regions')
      .select('*')
      .eq('user_id', userId)
      .order('level', { ascending: false })

    if (error || !data) return []
    return (data as RegionRow[]).map(toRegion)
  }

  async getGenresByUserId(userId: string): Promise<ExperienceAtlasGenre[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('experience_atlas_genres')
      .select('*')
      .eq('user_id', userId)
      .order('level', { ascending: false })

    if (error || !data) return []
    return (data as GenreRow[]).map(toGenre)
  }

  async getScenesByUserId(userId: string): Promise<ExperienceAtlasScene[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('experience_atlas_scenes')
      .select('*')
      .eq('user_id', userId)
      .order('level', { ascending: false })

    if (error || !data) return []
    return (data as SceneRow[]).map(toScene)
  }

  async calculateComplementarity(
    userIdA: string,
    userIdB: string,
  ): Promise<number> {
    const [regionsA, regionsB, genresA, genresB, scenesA, scenesB] =
      await Promise.all([
        this.getRegionsByUserId(userIdA),
        this.getRegionsByUserId(userIdB),
        this.getGenresByUserId(userIdA),
        this.getGenresByUserId(userIdB),
        this.getScenesByUserId(userIdA),
        this.getScenesByUserId(userIdB),
      ])

    let totalDiff = 0
    let count = 0

    const regionMapB = new Map(regionsB.map((r) => [r.region, r.level]))
    for (const r of regionsA) {
      const levelB = regionMapB.get(r.region) ?? 0
      totalDiff += Math.abs(r.level - levelB)
      count++
    }
    for (const r of regionsB) {
      if (!regionsA.some((a) => a.region === r.region)) {
        totalDiff += r.level
        count++
      }
    }

    const genreMapB = new Map(genresB.map((g) => [g.category, g.level]))
    for (const g of genresA) {
      const levelB = genreMapB.get(g.category) ?? 0
      totalDiff += Math.abs(g.level - levelB)
      count++
    }
    for (const g of genresB) {
      if (!genresA.some((a) => a.category === g.category)) {
        totalDiff += g.level
        count++
      }
    }

    const sceneMapB = new Map(scenesB.map((s) => [s.scene, s.level]))
    for (const s of scenesA) {
      const levelB = sceneMapB.get(s.scene) ?? 0
      totalDiff += Math.abs(s.level - levelB)
      count++
    }
    for (const s of scenesB) {
      if (!scenesA.some((a) => a.scene === s.scene)) {
        totalDiff += s.level
        count++
      }
    }

    if (count === 0) return 0
    return Math.round((totalDiff / count) * 10)
  }
}
