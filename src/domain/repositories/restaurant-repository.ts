// src/domain/repositories/restaurant-repository.ts
// R1: 외부 의존 0

import type { RestaurantSearchResult, NearbyRestaurant } from '@/domain/entities/search'

export interface RestaurantRepository {
  search(query: string, userId: string): Promise<RestaurantSearchResult[]>
  findNearby(lat: number, lng: number, radiusMeters: number, userId: string): Promise<NearbyRestaurant[]>
  create(input: CreateRestaurantInput): Promise<{ id: string; name: string; isExisting: boolean }>
}

export interface CreateRestaurantInput {
  name: string
  address?: string
  area?: string
  genre?: string
  priceRange?: number
  lat?: number
  lng?: number
  phone?: string
  externalIds?: globalThis.Record<string, string>
}
