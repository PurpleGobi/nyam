// src/domain/entities/filter-config.ts
// R1: 외부 의존 0

export type FilterAttributeType = 'text' | 'number' | 'boolean' | 'select'

export interface FilterAttribute {
  key: string
  label: string
  type: FilterAttributeType
  options?: string[]
}

export const RESTAURANT_FILTER_ATTRIBUTES: FilterAttribute[] = [
  { key: 'name', label: '식당명', type: 'text' },
  { key: 'genre', label: '장르', type: 'select', options: ['한식', '일식', '중식', '양식', '아시안', '퓨전', '카페', '베이커리', '바', '기타'] },
  { key: 'area', label: '지역', type: 'text' },
  { key: 'price_range', label: '가격대', type: 'select', options: ['$', '$$', '$$$', '$$$$'] },
  { key: 'satisfaction', label: '만족도', type: 'number' },
  { key: 'scene', label: '씬', type: 'select', options: ['혼밥', '데이트', '가족', '회식', '접대', '모임', '일상', '특별한날'] },
  { key: 'visit_date', label: '방문일', type: 'text' },
  { key: 'michelin_stars', label: '미슐랭 별', type: 'number' },
  { key: 'has_blue_ribbon', label: '블루리본', type: 'boolean' },
  { key: 'total_price', label: '총 금액', type: 'number' },
  { key: 'meal_time', label: '식사 시간대', type: 'select', options: ['아침', '점심', '저녁', '야식', '브런치', '간식'] },
]

export const WINE_FILTER_ATTRIBUTES: FilterAttribute[] = [
  { key: 'name', label: '와인명', type: 'text' },
  { key: 'wine_type', label: '종류', type: 'select', options: ['레드', '화이트', '로제', '스파클링', '디저트', '주정강화', '오렌지'] },
  { key: 'variety', label: '품종', type: 'text' },
  { key: 'region', label: '지역', type: 'text' },
  { key: 'country', label: '국가', type: 'text' },
  { key: 'vintage', label: '빈티지', type: 'number' },
  { key: 'satisfaction', label: '만족도', type: 'number' },
  { key: 'aroma_labels', label: '아로마', type: 'text' },
  { key: 'pairing_categories', label: '페어링', type: 'select', options: ['소고기', '돼지고기', '닭고기', '해산물', '파스타', '치즈', '디저트', '과일'] },
  { key: 'purchase_price', label: '구매 가격', type: 'number' },
  { key: 'body_level', label: '바디감', type: 'number' },
  { key: 'acidity_level', label: '산도', type: 'number' },
]
