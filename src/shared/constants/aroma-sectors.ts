import type { AromaSectorMeta, AromaSectorId, AromaRing } from '@/domain/entities/aroma'

/**
 * 16개 아로마 섹터 메타데이터 (WSET Level 3 기준)
 */
export const AROMA_SECTORS: readonly AromaSectorMeta[] = [
  // Ring 1 — 1차향 (포도 유래), 9 sectors, 40° each, start at -90°
  { id: 'citrus', ring: 1, nameKo: '시트러스', nameEn: 'Citrus', hex: '#fde047' },
  { id: 'apple_pear', ring: 1, nameKo: '사과/배', nameEn: 'Apple/Pear', hex: '#a3e635' },
  { id: 'tropical', ring: 1, nameKo: '열대과일', nameEn: 'Tropical', hex: '#fb923c' },
  { id: 'stone_fruit', ring: 1, nameKo: '핵과', nameEn: 'Stone Fruit', hex: '#fda4af' },
  { id: 'red_berry', ring: 1, nameKo: '붉은베리', nameEn: 'Red Berry', hex: '#f87171' },
  { id: 'dark_berry', ring: 1, nameKo: '검은베리', nameEn: 'Dark Berry', hex: '#a855f7' },
  { id: 'floral', ring: 1, nameKo: '꽃', nameEn: 'Floral', hex: '#f472b6' },
  { id: 'white_floral', ring: 1, nameKo: '흰꽃', nameEn: 'White Floral', hex: '#fef3c7' },
  { id: 'herb', ring: 1, nameKo: '허브', nameEn: 'Herb/Vegetal', hex: '#4ade80' },
  // Ring 2 — 2차향 (양조 유래), 4 sectors, 90° each
  { id: 'butter', ring: 2, nameKo: '버터/크림', nameEn: 'Butter/Cream (MLF)', hex: '#fde68a' },
  { id: 'vanilla', ring: 2, nameKo: '바닐라', nameEn: 'Vanilla/Cedar (Oak)', hex: '#d97706' },
  { id: 'spice', ring: 2, nameKo: '오크/향신료', nameEn: 'Clove/Cinnamon (Oak)', hex: '#991b1b' },
  { id: 'toast', ring: 2, nameKo: '토스트', nameEn: 'Toast/Smoke (Lees/Oak)', hex: '#b45309' },
  // Ring 3 — 3차향 (숙성 유래), 3 sectors, 120° each
  { id: 'leather', ring: 3, nameKo: '가죽/담배', nameEn: 'Leather/Tobacco', hex: '#78350f' },
  { id: 'earth', ring: 3, nameKo: '흙/버섯', nameEn: 'Earth/Mushroom', hex: '#78716c' },
  { id: 'nut', ring: 3, nameKo: '견과/건과일', nameEn: 'Nut/Dried Fruit', hex: '#92400e' },
] as const

/** 링별 섹터 개수 */
export const RING_SECTOR_COUNTS: Record<AromaRing, number> = { 1: 9, 2: 4, 3: 3 }

/** 링별 라벨 */
export const RING_LABELS: Record<AromaRing, string> = {
  1: '1차향 (포도 유래)',
  2: '2차향 (양조 유래)',
  3: '3차향 (숙성 유래)',
}

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
