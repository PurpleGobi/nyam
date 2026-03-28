import type { AromaSectorMeta, AromaSectorId, AromaRing } from '@/domain/entities/aroma'

/**
 * 15개 아로마 섹터 메타데이터
 * RATING_ENGINE.md §8 아로마 팔레트
 */
export const AROMA_SECTORS: readonly AromaSectorMeta[] = [
  // Ring 1 — 1차향 (과일/꽃), 8 sectors, 45° each, start at -90°
  { id: 'citrus', ring: 1, position: '12시', nameKo: '시트러스', nameEn: 'Citrus', hex: '#fde047' },
  { id: 'apple_pear', ring: 1, position: '1시', nameKo: '사과/배', nameEn: 'Apple/Pear', hex: '#a3e635' },
  { id: 'tropical', ring: 1, position: '2시', nameKo: '열대과일', nameEn: 'Tropical', hex: '#fb923c' },
  { id: 'stone_fruit', ring: 1, position: '3시', nameKo: '핵과', nameEn: 'Stone Fruit', hex: '#fda4af' },
  { id: 'red_berry', ring: 1, position: '4시', nameKo: '붉은베리', nameEn: 'Red Berry', hex: '#f87171' },
  { id: 'dark_berry', ring: 1, position: '5시', nameKo: '검은베리', nameEn: 'Dark Berry', hex: '#a855f7' },
  { id: 'floral', ring: 1, position: '6시', nameKo: '꽃', nameEn: 'Floral', hex: '#f472b6' },
  { id: 'white_floral', ring: 1, position: '7시', nameKo: '흰꽃', nameEn: 'White Floral', hex: '#fef3c7' },
  // Ring 2 — 2차향 (발효/숙성), 4 sectors, 90° each
  { id: 'butter', ring: 2, position: '8시', nameKo: '버터', nameEn: 'Butter/Brioche', hex: '#fde68a' },
  { id: 'vanilla', ring: 2, position: '9시', nameKo: '바닐라', nameEn: 'Vanilla/Toast', hex: '#d97706' },
  { id: 'spice', ring: 2, position: '10시', nameKo: '향신료', nameEn: 'Spice', hex: '#991b1b' },
  { id: 'herb', ring: 2, position: '11시', nameKo: '허브', nameEn: 'Herb', hex: '#4ade80' },
  // Ring 3 — 3차향 (숙성), 3 sectors, 120° each
  { id: 'leather', ring: 3, position: '중앙-좌', nameKo: '가죽', nameEn: 'Leather/Tobacco', hex: '#78350f' },
  { id: 'earth', ring: 3, position: '중앙-우', nameKo: '흙', nameEn: 'Earth/Mineral', hex: '#78716c' },
  { id: 'nut', ring: 3, position: '중앙-하', nameKo: '견과', nameEn: 'Nut/Chocolate', hex: '#92400e' },
] as const

/** 링별 섹터 개수 */
export const RING_SECTOR_COUNTS: Record<AromaRing, number> = { 1: 8, 2: 4, 3: 3 }

/** 링별 라벨 */
export const RING_LABELS: Record<AromaRing, string> = { 1: '1차향 (과일/꽃)', 2: '2차향 (발효/숙성)', 3: '3차향 (숙성)' }

/** ID로 섹터 조회 */
export function getAromaSectorById(id: AromaSectorId): AromaSectorMeta {
  const sector = AROMA_SECTORS.find((s) => s.id === id)
  if (!sector) throw new Error(`Unknown aroma sector: ${id}`)
  return sector
}

/** 링 번호로 섹터 필터 */
export function getAromaSectorsByRing(ring: AromaRing): AromaSectorMeta[] {
  return AROMA_SECTORS.filter((s) => s.ring === ring)
}
