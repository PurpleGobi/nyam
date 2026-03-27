import type { AromaSectorId, AromaRing } from '@/domain/entities/aroma'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 활성 섹터들의 가중 평균 hex 색상 계산
 */
export function calculateAromaColor(activeSectors: AromaSectorId[]): string | null {
  if (activeSectors.length === 0) return null

  let totalR = 0
  let totalG = 0
  let totalB = 0

  for (const sectorId of activeSectors) {
    const sector = AROMA_SECTORS.find((s) => s.id === sectorId)
    if (!sector) continue
    const [r, g, b] = hexToRgb(sector.hex)
    totalR += r
    totalG += g
    totalB += b
  }

  const count = activeSectors.length
  return rgbToHex(totalR / count, totalG / count, totalB / count)
}

/**
 * 활성 섹터 ID 목록에서 한국어 라벨 추출
 */
export function extractAromaLabels(activeIds: AromaSectorId[]): string[] {
  return activeIds
    .map((id) => AROMA_SECTORS.find((s) => s.id === id)?.nameKo)
    .filter((name): name is string => name !== undefined)
}

/**
 * 활성 섹터가 걸쳐 있는 링(1/2/3) 집합 반환
 */
export function getActiveRings(activeIds: AromaSectorId[]): Set<AromaRing> {
  const rings = new Set<AromaRing>()
  for (const id of activeIds) {
    const sector = AROMA_SECTORS.find((s) => s.id === id)
    if (sector) rings.add(sector.ring)
  }
  return rings
}
