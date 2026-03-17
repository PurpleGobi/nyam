import type { Restaurant, RestaurantStats } from "@/domain/entities/restaurant"

export interface RestaurantRepository {
  getById(id: string): Promise<Restaurant | null>
  getByExternalId(externalId: string): Promise<Restaurant | null>
  upsertFromKakao(data: {
    name: string
    address: string
    genre?: string
    region?: string
    latitude: number
    longitude: number
    phone?: string
    externalId: string
    externalUrl?: string
  }): Promise<Restaurant>
  getStats(restaurantId: string): Promise<RestaurantStats | null>
  searchByName(query: string, limit?: number): Promise<Restaurant[]>
}
