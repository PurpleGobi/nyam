// src/domain/entities/discover.ts
// R1: 외부 의존 0

export interface DiscoverCard {
  id: string
  name: string
  genre: string | null
  area: string | null
  specialty: string | null
  photoUrl: string | null
  nyamScore: number | null
  compositeScore: number
  michelinStars: number | null
  hasBlueRibbon: boolean
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
}

export interface DiscoverFilter {
  area: string
}

export const DISCOVER_AREAS = [
  '광화문', '을지로', '종로', '강남', '성수', '홍대', '이태원', '연남',
] as const

export type DiscoverArea = (typeof DISCOVER_AREAS)[number]
