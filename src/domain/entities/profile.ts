// src/domain/entities/profile.ts
// R1: 외부 의존 0

export interface ActivitySummary {
  totalRecords: number
  totalRestaurants: number
  totalWines: number
  avgSatisfaction: number
  currentStreak: number
}

export interface HeatmapCell {
  date: string
  intensity: 0 | 1 | 2 | 3 | 4
}

export interface RestaurantStats {
  totalCount: number
  avgScore: number
  topGenres: { name: string; count: number }[]
  topCities: { name: string; count: number }[]
  monthlyTrend: { month: string; count: number }[]
}

export interface WineStats {
  totalCount: number
  avgScore: number
  topVarietals: { name: string; count: number }[]
  topCountries: { name: string; count: number }[]
  monthlyTrend: { month: string; count: number }[]
}

export type WrappedCategory = 'all' | 'restaurant' | 'wine'

export interface WrappedData {
  totalRecords: number
  topGenre: string | null
  topCity: string | null
  topVarietal: string | null
  topCountry: string | null
  avgSatisfaction: number
  streakDays: number
  mostActiveMonth: string | null
}
