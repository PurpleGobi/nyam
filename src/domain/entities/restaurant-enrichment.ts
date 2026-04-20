// src/domain/entities/restaurant-enrichment.ts
// R1: 외부 의존 0

export type EnrichmentStatus = 'pending' | 'processing' | 'done' | 'failed'

export type EnrichmentSourceType =
  | 'naver_blog'
  | 'naver_local'
  | 'naver_news'
  | 'google_review'
  | 'google_place'
  | 'youtube'
  | 'kakao_local'
  | 'other_web'

export interface EnrichmentSource {
  id: number
  type: EnrichmentSourceType
  url: string
  title: string
  fetchedAt: string
}

export interface EnrichmentClaim {
  text: string
  quote?: string
  sourceIds: number[]
}

export interface EnrichmentAtmosphere {
  tags: string[]
  sourceIds: number[]
}

export interface EnrichmentPriceRange {
  text: string
  sourceIds: number[]
}

export interface EnrichmentSignature {
  name: string
  mentionCount: number
  sourceIds: number[]
}

export interface EnrichmentAiSummary {
  pros: EnrichmentClaim[]
  cons: EnrichmentClaim[]
  atmosphere: EnrichmentAtmosphere | null
  priceRange: EnrichmentPriceRange | null
  signatures: EnrichmentSignature[]
  overallNote: string | null
}

export interface EnrichmentExternalRating {
  rating: number
  count: number
  url: string
}

export interface EnrichmentExternalRatings {
  naver: EnrichmentExternalRating | null
  google: EnrichmentExternalRating | null
}

export interface RestaurantEnrichment {
  restaurantId: string
  sources: EnrichmentSource[]
  aiSummary: EnrichmentAiSummary | null
  externalRatings: EnrichmentExternalRatings | null
  photoUrls: string[]
  photoAttributions: string[]
  status: EnrichmentStatus
  errorMessage: string | null
  enrichedAt: string | null
  expiresAt: string
  sourceVersion: number
  createdAt: string
  updatedAt: string
}

export const ENRICHMENT_CONSTANTS = {
  TTL_DAYS: 30,
  MAX_SOURCES: 15,
  MAX_QUOTE_LENGTH: 20,
  MAX_LINKS_DISPLAY: 10,
  MAX_PHOTOS: 5,
  CURRENT_SOURCE_VERSION: 1,
} as const

export function isEnrichmentFresh(e: RestaurantEnrichment | null): boolean {
  if (!e || e.status !== 'done') return false
  return new Date(e.expiresAt).getTime() > Date.now()
}

export function needsEnrichment(e: RestaurantEnrichment | null): boolean {
  if (!e) return true
  if (e.status === 'failed') return true
  if (e.status === 'done' && new Date(e.expiresAt).getTime() <= Date.now()) return true
  return false
}
