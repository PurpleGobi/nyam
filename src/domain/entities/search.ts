// src/domain/entities/search.ts
// R1: 외부 의존 0

export interface SearchResultBase {
  id: string
  name: string
  hasRecord: boolean
}

export interface RestaurantSearchResult extends SearchResultBase {
  type: 'restaurant'
  genre: string | null
  area: string | null
  address: string | null
  distance: number | null
  lat: number | null
  lng: number | null
}

export interface WineSearchResult extends SearchResultBase {
  type: 'wine'
  producer: string | null
  vintage: number | null
  wineType: string | null
  region: string | null
  country: string | null
}

export type SearchResult = RestaurantSearchResult | WineSearchResult

export type SearchScreenState = 'idle' | 'typing' | 'searching' | 'results' | 'empty'

export interface RecentSearch {
  query: string
  targetType: 'restaurant' | 'wine'
  timestamp: number
}

export interface NearbyRestaurant {
  id: string
  name: string
  genre: string | null
  area: string | null
  address: string | null
  lat: number | null
  lng: number | null
  distance: number
  hasRecord: boolean
}
