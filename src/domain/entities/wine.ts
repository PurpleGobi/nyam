// src/domain/entities/wine.ts
// R1: 외부 의존 0

export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'

export interface CriticScores {
  [critic: string]: number
}

export interface Wine {
  id: string
  name: string
  producer: string | null
  region: string | null
  subRegion: string | null
  country: string | null
  variety: string | null
  grapeVarieties: globalThis.Record<string, unknown> | null
  wineType: WineType
  vintage: number | null
  abv: number | null
  labelImageUrl: string | null
  photos: string[] | null
  bodyLevel: number | null
  acidityLevel: number | null
  sweetnessLevel: number | null
  foodPairings: string[] | null
  servingTemp: string | null
  decanting: string | null
  referencePrice: number | null
  drinkingWindowStart: number | null
  drinkingWindowEnd: number | null
  vivinoRating: number | null
  criticScores: CriticScores | null
  classification: string | null
  nyamScore: number | null
  nyamScoreUpdatedAt: string | null
  externalIds: globalThis.Record<string, string> | null
  cachedAt: string | null
  nextRefreshAt: string | null
  createdAt: string
}

export const WINE_TYPE_LABELS: globalThis.Record<WineType, string> = {
  red: '레드',
  white: '화이트',
  rose: '로제',
  sparkling: '스파클링',
  orange: '오렌지',
  fortified: '주정강화',
  dessert: '디저트',
}

export const WINE_TYPE_COLORS: globalThis.Record<WineType, string> = {
  red: '#8B2252',
  white: '#C9A96E',
  rose: '#D4879B',
  sparkling: '#7A9BAE',
  orange: '#C17B5E',
  fortified: '#8B7396',
  dessert: '#B87272',
}
