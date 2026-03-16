import { createClient } from '@/infrastructure/supabase/client'
import type { TasteDna, TasteDnaWine, TasteDnaHomecook } from '@/domain/entities/taste-dna'
import type { TasteDnaRepository } from '@/domain/repositories/taste-dna-repository'
import type { Database } from '@/infrastructure/supabase/types'

type TasteDnaRow = Database['public']['Tables']['taste_dna']['Row']
type TasteDnaWineRow = Database['public']['Tables']['taste_dna_wine']['Row']
type TasteDnaHomecookRow = Database['public']['Tables']['taste_dna_homecook']['Row']

function toTasteDna(row: TasteDnaRow): TasteDna {
  return {
    userId: row.user_id,
    flavorSpicy: row.flavor_spicy,
    flavorSweet: row.flavor_sweet,
    flavorSalty: row.flavor_salty,
    flavorSour: row.flavor_sour,
    flavorUmami: row.flavor_umami,
    flavorRich: row.flavor_rich,
    textureCrispy: row.texture_crispy,
    textureTender: row.texture_tender,
    textureChewy: row.texture_chewy,
    atmosphereNoise: row.atmosphere_noise,
    atmosphereFormality: row.atmosphere_formality,
    atmosphereSpace: row.atmosphere_space,
    priceSensitivity: row.price_sensitivity,
    priceAvg: row.price_avg ?? 0,
    priceRange: [row.price_range_min ?? 0, row.price_range_max ?? 0],
    categoryPreferences: (row.category_preferences as Record<string, number>) ?? {},
    peakDay: row.peak_day != null ? String(row.peak_day) : '',
    peakHour: row.peak_hour ?? 0,
    adventurousness: row.adventurousness,
    tasteTypeCode: row.taste_type_code ?? '',
    tasteTypeName: row.taste_type_name ?? '',
    sampleCount: row.sample_count,
  }
}

function toTasteDnaWine(row: TasteDnaWineRow): TasteDnaWine {
  return {
    userId: row.user_id,
    prefBody: row.pref_body,
    prefAcidity: row.pref_acidity,
    prefTannin: row.pref_tannin,
    prefSweetness: row.pref_sweetness,
    aromaFruit: row.aroma_fruit,
    aromaFloral: row.aroma_floral,
    aromaSpice: row.aroma_spice,
    aromaOak: row.aroma_oak,
    aromaMineral: row.aroma_mineral,
    aromaHerbal: row.aroma_herbal,
    preferredVarieties: row.preferred_varieties ?? [],
    preferredOrigins: row.preferred_origins ?? [],
    priceRange: [row.price_range_min ?? 0, row.price_range_max ?? 0],
    sampleCount: row.sample_count,
  }
}

function toTasteDnaHomecook(row: TasteDnaHomecookRow): TasteDnaHomecook {
  return {
    userId: row.user_id,
    prefDifficulty: row.pref_difficulty,
    prefTimeInvestment: row.pref_time_investment,
    methodPreferences: (row.method_preferences as Record<string, number>) ?? {},
    preferredCuisines: row.preferred_cuisines ?? [],
    sampleCount: row.sample_count,
  }
}

function extractVector(dna: TasteDna): number[] {
  return [
    dna.flavorSpicy,
    dna.flavorSweet,
    dna.flavorSalty,
    dna.flavorSour,
    dna.flavorUmami,
    dna.flavorRich,
    dna.textureCrispy,
    dna.textureTender,
    dna.textureChewy,
    dna.atmosphereNoise,
    dna.atmosphereFormality,
    dna.atmosphereSpace,
    dna.priceSensitivity,
    dna.adventurousness,
  ]
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  if (magA === 0 || magB === 0) return 0
  return Math.round((dot / (magA * magB)) * 100)
}

export class SupabaseTasteDnaRepository implements TasteDnaRepository {
  async getByUserId(userId: string): Promise<TasteDna | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('taste_dna')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return toTasteDna(data as TasteDnaRow)
  }

  async getWineByUserId(userId: string): Promise<TasteDnaWine | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('taste_dna_wine')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return toTasteDnaWine(data as TasteDnaWineRow)
  }

  async getHomecookByUserId(userId: string): Promise<TasteDnaHomecook | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('taste_dna_homecook')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return toTasteDnaHomecook(data as TasteDnaHomecookRow)
  }

  async calculateSimilarity(
    userIdA: string,
    userIdB: string,
  ): Promise<number> {
    const [dnaA, dnaB] = await Promise.all([
      this.getByUserId(userIdA),
      this.getByUserId(userIdB),
    ])

    if (!dnaA || !dnaB) return 0

    const vectorA = extractVector(dnaA)
    const vectorB = extractVector(dnaB)

    return cosineSimilarity(vectorA, vectorB)
  }
}
