// src/domain/entities/register.ts
// R1: 외부 의존 0

export const RESTAURANT_GENRES = [
  '한식', '일식', '양식', '중식', '이탈리안', '프렌치', '동남아', '태국', '베트남',
  '인도', '스페인', '멕시칸', '아시안', '파인다이닝', '비스트로', '카페', '베이커리', '바', '주점',
] as const

export type RestaurantGenre = (typeof RESTAURANT_GENRES)[number]

export const WINE_TYPES = [
  'red', 'white', 'rose', 'sparkling', 'orange', 'fortified', 'dessert',
] as const

export type WineType = (typeof WINE_TYPES)[number]

export const WINE_TYPE_LABELS: globalThis.Record<WineType, string> = {
  red: '레드',
  white: '화이트',
  rose: '로제',
  sparkling: '스파클링',
  orange: '오렌지',
  fortified: '주정강화',
  dessert: '디저트',
}
