// src/domain/entities/wine.ts
// R1: 외부 의존 0

export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'

/** 블렌드 품종 비율 (grape_varieties JSONB 배열 아이템) */
export interface GrapeVariety {
  name: string
  pct: number    // 퍼센트 (0~100)
}

/** critic_scores JSONB */
export interface CriticScores {
  RP?: number   // Robert Parker
  WS?: number   // Wine Spectator
  JR?: number   // Jancis Robinson
  JH?: number   // James Halliday
}

/** 가격 분석 리뷰 (AI) */
export interface PriceReview {
  verdict: 'buy' | 'conditional_buy' | 'avoid'
  summary: string
  alternatives: Array<{ name: string; price: string }>
}

/** external_ids JSONB */
export interface WineExternalIds {
  vivino?: string
  wine_searcher?: string
}

export interface Wine {
  id: string
  name: string
  producer: string | null
  region: string | null
  subRegion: string | null
  appellation: string | null
  country: string | null
  variety: string | null
  grapeVarieties: GrapeVariety[]
  wineType: WineType
  vintage: number | null
  abv: number | null
  labelImageUrl: string | null
  photos: string[]
  bodyLevel: number | null
  acidityLevel: number | null
  sweetnessLevel: number | null
  foodPairings: string[]
  servingTemp: string | null
  decanting: string | null
  referencePriceMin: number | null
  referencePriceMax: number | null
  drinkingWindowStart: number | null
  drinkingWindowEnd: number | null
  vivinoRating: number | null
  criticScores: CriticScores | null
  classification: string | null
  tastingNotes: string | null
  priceReview: PriceReview | null
  nyamScore: number | null
  nyamScoreUpdatedAt: string | null
  externalIds: WineExternalIds | null
  cachedAt: string | null
  nextRefreshAt: string | null
  createdAt: string
}

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  red: '레드',
  white: '화이트',
  rose: '로제',
  sparkling: '스파클링',
  orange: '오렌지',
  fortified: '주정강화',
  dessert: '디저트',
}

/** AI 와인 텍스트 검색 결과 후보 */
export interface WineSearchCandidate {
  name: string
  nameKo: string | null
  producer: string | null
  vintage: number | null
  wineType: string
  region: string | null
  country: string | null
  confidence: number
  labelImageUrl: string | null
}

export const WINE_TYPE_COLORS: Record<WineType, string> = {
  red: '#8B2252',
  white: '#C9A96E',
  rose: '#D4879B',
  sparkling: '#7A9BAE',
  orange: '#C17B5E',
  fortified: '#8B7396',
  dessert: '#B87272',
}
