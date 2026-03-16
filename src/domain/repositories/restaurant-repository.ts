import type { Restaurant } from '../entities/restaurant'

export interface RestaurantSearchParams {
  query: string
  location?: { lat: number; lng: number }
}

export interface RestaurantRepository {
  getById(id: string): Promise<Restaurant | null>
  search(params: RestaurantSearchParams): Promise<Restaurant[]>
  getByRegion(region: string): Promise<Restaurant[]>
  getNearby(lat: number, lng: number, radiusKm: number): Promise<Restaurant[]>
}
