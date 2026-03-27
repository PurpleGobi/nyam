import type { RestaurantRepository, CreateRestaurantInput } from '@/domain/repositories/restaurant-repository'
import type { RestaurantSearchResult, NearbyRestaurant } from '@/domain/entities/search'
import { createClient } from '@/infrastructure/supabase/client'

export class SupabaseRestaurantRepository implements RestaurantRepository {
  private get supabase() {
    return createClient()
  }

  async search(query: string, userId: string): Promise<RestaurantSearchResult[]> {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('id, name, genre, area, address, lat, lng')
      .ilike('name', `%${query}%`)
      .limit(20)

    if (error) throw new Error(`식당 검색 실패: ${error.message}`)

    const { data: userRecords } = await this.supabase
      .from('records')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')

    const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

    return (data ?? []).map((r) => ({
      id: r.id,
      type: 'restaurant' as const,
      name: r.name,
      genre: r.genre,
      area: r.area,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      distance: null,
      hasRecord: recordedIds.has(r.id),
    }))
  }

  async findNearby(lat: number, lng: number, radiusMeters: number, userId: string): Promise<NearbyRestaurant[]> {
    const { data, error } = await this.supabase.rpc('restaurants_within_radius', {
      lat,
      lng,
      radius_meters: radiusMeters,
    })

    if (error) throw new Error(`근처 식당 조회 실패: ${error.message}`)

    const { data: userRecords } = await this.supabase
      .from('records')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')

    const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

    return (
      (data as Array<{ id: string; name: string; genre: string | null; area: string | null; distance: number }>) ?? []
    ).map((r) => ({
      id: r.id,
      name: r.name,
      genre: r.genre,
      area: r.area,
      distance: r.distance,
      hasRecord: recordedIds.has(r.id),
    }))
  }

  async create(input: CreateRestaurantInput): Promise<{ id: string; name: string; isExisting: boolean }> {
    const { data: existing } = await this.supabase
      .from('restaurants')
      .select('id, name')
      .ilike('name', input.name)
      .limit(1)
      .single()

    if (existing) {
      return { id: existing.id, name: existing.name, isExisting: true }
    }

    const { data, error } = await this.supabase
      .from('restaurants')
      .insert({
        name: input.name,
        address: input.address ?? null,
        area: input.area ?? null,
        genre: input.genre ?? null,
        price_range: input.priceRange ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        phone: input.phone ?? null,
        external_ids: input.externalIds ?? null,
      })
      .select('id, name')
      .single()

    if (error) throw new Error(`식당 등록 실패: ${error.message}`)
    return { id: data.id, name: data.name, isExisting: false }
  }
}
