// src/domain/entities/register.ts
// R1: 외부 의존 0

export const RESTAURANT_GENRES = [
  '한식', '일식', '중식', '태국', '베트남', '인도', '이탈리안', '프렌치',
  '스페인', '지중해', '미국', '멕시칸', '카페', '바/주점', '베이커리', '기타',
] as const

export type RestaurantGenre = (typeof RESTAURANT_GENRES)[number]

/** 장르 대분류 그룹 (UI 표시용) */
export const GENRE_GROUPS: { label: string; genres: RestaurantGenre[] }[] = [
  { label: '동아시아', genres: ['한식', '일식', '중식'] },
  { label: '동남아 · 남아시아', genres: ['태국', '베트남', '인도'] },
  { label: '유럽', genres: ['이탈리안', '프렌치', '스페인', '지중해'] },
  { label: '아메리카', genres: ['미국', '멕시칸'] },
  { label: '음료 · 디저트', genres: ['카페', '바/주점', '베이커리'] },
  { label: '기타', genres: ['기타'] },
]

export const WINE_TYPES = [
  'red', 'white', 'rose', 'sparkling', 'orange', 'fortified', 'dessert',
] as const

export type WineType = (typeof WINE_TYPES)[number]

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  red: '레드',
  white: '화이트',
  rose: '로제',
  sparkling: '스파클링',
  orange: '오렌지',
  fortified: '주정강화',
  dessert: '디저트',
}

// ─── 등록 입력 타입 ───

/** 식당 등록 입력 */
export interface CreateRestaurantInput {
  name: string
  address?: string | null
  area?: string | null
  genre?: RestaurantGenre | null
  priceRange?: number | null
  lat?: number | null
  lng?: number | null
  phone?: string | null
  externalIdKakao?: string | null
  externalIdGoogle?: string | null
  externalIdNaver?: string | null
}

/** 와인 등록 입력 */
export interface CreateWineInput {
  name: string
  wineType: WineType
  producer: string | null
  vintage: number | null
  region: string | null
  country: string | null
  variety: string | null
  labelImageUrl?: string | null
}

/** 등록 결과 */
export interface RegisterResult {
  id: string
  name: string
  type: 'restaurant' | 'wine'
  isExisting: boolean
}
