// src/domain/entities/restaurant.ts
// R1: 외부 의존 0

export type RestaurantGenre =
  | '한식' | '일식' | '중식' | '태국' | '베트남' | '인도'
  | '이탈리안' | '프렌치' | '스페인' | '지중해' | '미국' | '멕시칸'
  | '카페' | '바/주점' | '베이커리' | '기타'

export const GENRE_MAJOR_CATEGORIES: Record<string, RestaurantGenre[]> = {
  '한식': ['한식'],
  '일식': ['일식'],
  '중식': ['중식'],
  '양식': ['이탈리안', '프렌치', '스페인', '지중해', '미국', '멕시칸'],
  '아시안': ['태국', '베트남', '인도'],
  '카페': ['카페', '베이커리'],
  '바/주점': ['바/주점'],
}

export const ALL_GENRES: RestaurantGenre[] = [
  '한식', '일식', '중식', '태국', '베트남', '인도',
  '이탈리안', '프렌치', '스페인', '지중해', '미국', '멕시칸',
  '카페', '바/주점', '베이커리', '기타',
]

export type PriceRange = 1 | 2 | 3 | 4

export interface BusinessHours {
  mon?: string; tue?: string; wed?: string; thu?: string
  fri?: string; sat?: string; sun?: string
}

export interface MenuItem { name: string; price: number }

export interface MediaAppearance { show: string; season?: string; year?: number }

export interface RestaurantExternalIds { kakao?: string; naver?: string; google?: string }

export interface Restaurant {
  id: string
  name: string
  address: string | null
  country: string
  city: string
  area: string | null
  district: string | null
  genre: RestaurantGenre | null
  priceRange: PriceRange | null
  lat: number | null
  lng: number | null
  phone: string | null
  hours: BusinessHours | null
  photos: string[] | null
  menus: MenuItem[] | null
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
  michelinStars: number | null
  hasBlueRibbon: boolean
  mediaAppearances: MediaAppearance[] | null
  nyamScore: number | null
  nyamScoreUpdatedAt: string | null
  externalIds: RestaurantExternalIds | null
  cachedAt: string | null
  nextRefreshAt: string | null
  createdAt: string
}
