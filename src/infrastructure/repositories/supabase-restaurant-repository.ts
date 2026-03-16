import { createClient } from '@/infrastructure/supabase/client'
import type { Restaurant, MenuItem } from '@/domain/entities/restaurant'
import type {
  RestaurantRepository,
  RestaurantSearchParams,
} from '@/domain/repositories/restaurant-repository'
import type { Database } from '@/infrastructure/supabase/types'

type RestaurantRow = Database['public']['Tables']['restaurants']['Row']

function toMenuItems(raw: Record<string, unknown> | null): MenuItem[] {
  if (!raw || !Array.isArray(raw)) return []
  return (raw as Array<Record<string, unknown>>).map((item) => ({
    name: (item.name as string) ?? '',
    price: (item.price as number) ?? null,
    description: (item.description as string) ?? null,
  }))
}

function toRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    region: row.region ?? '',
    category: row.category ?? '',
    location: {
      lat: row.latitude ?? 0,
      lng: row.longitude ?? 0,
    },
    phone: row.phone,
    hours: (row.hours as Record<string, string>) ?? {},
    source: row.source ?? '',
    externalId: row.external_id,
    externalUrl: row.external_url,
    menuItems: toMenuItems(row.menu_items),
    syncedAt: row.synced_at ?? row.created_at,
  }
}

export class SupabaseRestaurantRepository implements RestaurantRepository {
  async getById(id: string): Promise<Restaurant | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return toRestaurant(data as RestaurantRow)
  }

  async search(params: RestaurantSearchParams): Promise<Restaurant[]> {
    const supabase = createClient()
    let query = supabase
      .from('restaurants')
      .select('*')
      .ilike('name', `%${params.query}%`)

    if (params.location) {
      const delta = 0.05
      query = query
        .gte('latitude', params.location.lat - delta)
        .lte('latitude', params.location.lat + delta)
        .gte('longitude', params.location.lng - delta)
        .lte('longitude', params.location.lng + delta)
    }

    const { data, error } = await query.limit(50)

    if (error || !data) return []
    return (data as RestaurantRow[]).map(toRestaurant)
  }

  async getByRegion(region: string): Promise<Restaurant[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('region', region)

    if (error || !data) return []
    return (data as RestaurantRow[]).map(toRestaurant)
  }

  async getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<Restaurant[]> {
    const supabase = createClient()
    const delta = radiusKm * 0.01

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .gte('latitude', lat - delta)
      .lte('latitude', lat + delta)
      .gte('longitude', lng - delta)
      .lte('longitude', lng + delta)

    if (error || !data) return []
    return (data as RestaurantRow[]).map(toRestaurant)
  }
}
