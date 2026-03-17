import { createClient } from "@/infrastructure/supabase/client"
import type { Restaurant, RestaurantStats } from "@/domain/entities/restaurant"
import type { RestaurantRepository } from "@/domain/repositories/restaurant-repository"

function mapDbRestaurant(data: Record<string, unknown>): Restaurant {
  return {
    id: data.id as string,
    name: data.name as string,
    address: data.address as string | null,
    region: data.region as string | null,
    genre: data.genre as string | null,
    latitude: data.latitude as number | null,
    longitude: data.longitude as number | null,
    phone: data.phone as string | null,
    hours: data.hours as Record<string, unknown> | null,
    source: data.source as string | null,
    externalId: data.external_id as string | null,
    externalUrl: data.external_url as string | null,
    menuItems: data.menu_items as Record<string, unknown> | null,
    syncedAt: data.synced_at as string | null,
    createdAt: data.created_at as string,
  }
}

export class SupabaseRestaurantRepository implements RestaurantRepository {
  private supabase = createClient()

  async getById(id: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) return null
    return mapDbRestaurant(data)
  }

  async getByExternalId(externalId: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase
      .from("restaurants")
      .select("*")
      .eq("external_id", externalId)
      .single()

    if (error || !data) return null
    return mapDbRestaurant(data)
  }

  async upsertFromKakao(input: {
    name: string
    address: string
    genre?: string
    region?: string
    latitude: number
    longitude: number
    phone?: string
    externalId: string
    externalUrl?: string
  }): Promise<Restaurant> {
    const { data, error } = await this.supabase
      .from("restaurants")
      .upsert(
        {
          name: input.name,
          address: input.address,
          genre: input.genre ?? null,
          region: input.region ?? null,
          latitude: input.latitude,
          longitude: input.longitude,
          phone: input.phone ?? null,
          external_id: input.externalId,
          external_url: input.externalUrl ?? null,
          source: "kakao",
          synced_at: new Date().toISOString(),
        },
        { onConflict: "external_id" },
      )
      .select()
      .single()

    if (error) throw new Error(`Failed to upsert restaurant: ${error.message}`)
    return mapDbRestaurant(data)
  }

  async getStats(restaurantId: string): Promise<RestaurantStats | null> {
    const { data, error } = await this.supabase
      .from("restaurant_stats")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .single()

    if (error || !data) return null
    return {
      restaurantId: data.restaurant_id,
      recordCount: data.record_count,
      uniqueUsers: data.unique_users,
      avgTaste: data.avg_taste,
      avgValue: data.avg_value,
      avgService: data.avg_service,
      avgAtmosphere: data.avg_atmosphere,
      avgCleanliness: data.avg_cleanliness,
      avgPortion: data.avg_portion,
      avgOverall: data.avg_overall,
      latestRecordAt: data.latest_record_at,
      updatedAt: data.updated_at,
    }
  }

  async searchByName(query: string, limit = 10): Promise<Restaurant[]> {
    const { data, error } = await this.supabase
      .from("restaurants")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(limit)

    if (error) throw new Error(`Failed to search restaurants: ${error.message}`)
    return (data ?? []).map(mapDbRestaurant)
  }
}
