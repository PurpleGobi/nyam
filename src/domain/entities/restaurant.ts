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

export type PriceRange = 1 | 2 | 3

export interface BusinessHours {
  mon?: string; tue?: string; wed?: string; thu?: string
  fri?: string; sat?: string; sun?: string
}

export interface MenuItem { name: string; price: number }

/** 식당 명성 정보 (restaurants.rp JSONB 캐시와 1:1 대응) */
export interface RestaurantRp {
  type: 'michelin' | 'blue_ribbon' | 'tv'
  grade: string  // '3_star', '2_star', '1_star', 'bib', '3_ribbon', '2_ribbon', '1_ribbon', 프로그램명
}

export interface RestaurantExternalIds { kakao?: string; naver?: string; google?: string }

export interface Restaurant {
  id: string
  name: string
  address: string | null
  country: string
  city: string
  area: string[] | null
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
  rp: RestaurantRp[]
  nyamScore: number | null
  nyamScoreUpdatedAt: string | null
  externalIds: RestaurantExternalIds | null
  cachedAt: string | null
  nextRefreshAt: string | null
  createdAt: string
}
