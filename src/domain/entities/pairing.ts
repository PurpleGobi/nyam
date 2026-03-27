// src/domain/entities/pairing.ts
// R1: 외부 의존 0

import type { PairingCategory } from '@/domain/entities/record'

export interface PairingCategoryMeta {
  value: PairingCategory
  label: string
  icon: string
  examples: string
}

export const PAIRING_CATEGORIES: readonly PairingCategoryMeta[] = [
  { value: 'red_meat', label: '적색육', icon: 'beef', examples: '스테이크 · 양갈비 · 오리 · 사슴' },
  { value: 'white_meat', label: '백색육', icon: 'drumstick', examples: '닭 · 돼지 · 송아지 · 토끼' },
  { value: 'seafood', label: '어패류', icon: 'fish', examples: '생선 · 갑각류 · 조개 · 굴 · 초밥' },
  { value: 'cheese', label: '치즈·유제품', icon: 'milk', examples: '숙성치즈 · 블루 · 브리 · 크림소스' },
  { value: 'vegetable', label: '채소·곡물', icon: 'leaf', examples: '버섯 · 트러플 · 리조또 · 파스타' },
  { value: 'spicy', label: '매운·발효', icon: 'flame', examples: '커리 · 마라 · 김치 · 된장' },
  { value: 'dessert', label: '디저트·과일', icon: 'candy', examples: '다크초콜릿 · 타르트 · 건과일' },
  { value: 'charcuterie', label: '샤퀴트리·견과', icon: 'nut', examples: '하몽 · 살라미 · 아몬드 · 올리브' },
] as const
