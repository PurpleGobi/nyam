import type { WineRepository, CreateWineInput } from '@/domain/repositories/wine-repository'
import type { WineSearchResult } from '@/domain/entities/search'
import type { Database } from '@/infrastructure/supabase/types'
import { createClient } from '@/infrastructure/supabase/client'

type WineInsert = Database['public']['Tables']['wines']['Insert']

export class SupabaseWineRepository implements WineRepository {
  private get supabase() {
    return createClient()
  }

  async search(query: string, userId: string): Promise<WineSearchResult[]> {
    const { data: wines, error } = await this.supabase
      .from('wines')
      .select('id, name, producer, vintage, wine_type, region, country')
      .or(`name.ilike.%${query}%,producer.ilike.%${query}%`)
      .limit(20)

    if (error) throw new Error(`와인 검색 실패: ${error.message}`)

    const { data: userRecords } = await this.supabase
      .from('records')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', 'wine')

    const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

    return (wines ?? []).map((w) => ({
      id: w.id,
      type: 'wine' as const,
      name: w.name,
      producer: w.producer,
      vintage: w.vintage,
      wineType: w.wine_type,
      region: w.region,
      country: w.country,
      hasRecord: recordedIds.has(w.id),
    }))
  }

  async create(input: CreateWineInput): Promise<{ id: string; name: string; isExisting: boolean }> {
    let query = this.supabase
      .from('wines')
      .select('id, name')
      .ilike('name', input.name)

    if (input.vintage) {
      query = query.eq('vintage', input.vintage)
    }

    const { data: existing } = await query.limit(1).single()

    if (existing) {
      return { id: existing.id, name: existing.name, isExisting: true }
    }

    const insertData: WineInsert = {
      name: input.name,
      wine_type: input.wineType as WineInsert['wine_type'],
      producer: input.producer ?? null,
      vintage: input.vintage ?? null,
      region: input.region ?? null,
      country: input.country ?? null,
      variety: input.variety ?? null,
    }

    const { data, error } = await this.supabase
      .from('wines')
      .insert(insertData)
      .select('id, name')
      .single()

    if (error) throw new Error(`와인 등록 실패: ${error.message}`)
    return { id: data.id, name: data.name, isExisting: false }
  }
}
